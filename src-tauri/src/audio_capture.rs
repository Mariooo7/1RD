#[cfg(target_os = "macos")]
use screencapturekit::{
    sc_content_filter::{InitParams, SCContentFilter},
    sc_error_handler::StreamErrorHandler,
    sc_output_handler::{StreamOutput, SCStreamOutputType},
    sc_shareable_content::SCShareableContent,
    sc_stream::SCStream,
    sc_stream_configuration::SCStreamConfiguration,
    cm_sample_buffer::CMSampleBuffer,
};

use rustfft::{FftPlanner, num_complex::Complex};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

const FFT_SIZE: usize = 8192;
const SPECTRUM_BINS: usize = 128;
static CAPTURE_STARTED: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Copy)]
struct AnalysisResult {
    cutoff_freq: f32,
    rolloff_95: f32,
    hf_ratio: f32,
    cliff_drop_db: f32,
}

struct GradeState {
    level: u8,
    downgrade_streak: u8,
}

struct AudioProcessor {
    planner: Arc<Mutex<FftPlanner<f32>>>,
    buffer: Arc<Mutex<Vec<f32>>>,
    app_handle: AppHandle,
    emit_counter: AtomicUsize,
    grade_state: Arc<Mutex<GradeState>>,
}

impl AudioProcessor {
    fn new(app_handle: AppHandle) -> Self {
        Self {
            planner: Arc::new(Mutex::new(FftPlanner::new())),
            buffer: Arc::new(Mutex::new(Vec::with_capacity(FFT_SIZE * 3))),
            app_handle,
            emit_counter: AtomicUsize::new(0),
            grade_state: Arc::new(Mutex::new(GradeState {
                level: 1,
                downgrade_streak: 0,
            })),
        }
    }

    fn process_audio(&self, samples: &[f32], sample_rate: f64, bits_per_channel: u32) {
        let mut buffer = self.buffer.lock().unwrap();
        buffer.extend_from_slice(samples);

        while buffer.len() >= FFT_SIZE {
            // Process FFT
            let mut planner = self.planner.lock().unwrap();
            let fft = planner.plan_fft_forward(FFT_SIZE);
            
            // Take exactly FFT_SIZE samples
            let process_buffer: Vec<Complex<f32>> = buffer
                .drain(0..FFT_SIZE)
                .enumerate()
                .map(|(i, x)| {
                    let phase = (2.0 * std::f32::consts::PI * i as f32) / (FFT_SIZE as f32 - 1.0);
                    let w = 0.5 - 0.5 * phase.cos();
                    Complex { re: x * w, im: 0.0 }
                })
                .collect();
            
            let mut spectrum = process_buffer;
            fft.process(&mut spectrum);

            // Calculate magnitudes and analyze
            let magnitudes: Vec<f32> = spectrum
                .iter()
                .take(FFT_SIZE / 2)
                .map(|c| c.norm_sqr())
                .collect();
            
            let analysis = self.analyze_quality(&magnitudes, sample_rate);
            let raw_grade_level = classify_quality_level(analysis);
            let stable_grade_level = self.stabilize_grade(raw_grade_level);
            let quality_grade = grade_level_to_label(stable_grade_level).to_string();
            let compact_magnitudes = self.downsample_magnitudes(&magnitudes, SPECTRUM_BINS);

            let emit_idx = self.emit_counter.fetch_add(1, Ordering::Relaxed);
            
            // Convert to binary payload to save JSON serialization overhead
            // Format: 
            // [0..4] sample_rate (f32)
            // [4..8] cutoff_freq (f32)
            // [8..12] quality_grade_len (u32)
            // [12..12+len] quality_grade (utf8 bytes)
            // [12+len..16+len] bits_per_channel (u32)
            // [16+len..20+len] rolloff_95 (f32) <--- NEW
            // [20+len..24+len] hf_ratio (f32) <--- NEW
            // [24+len..28+len] cliff_drop_db (f32) <--- NEW
            // [28+len..] magnitudes (f32 array)
            
            let mut bin_payload = Vec::new();
            bin_payload.extend_from_slice(&(sample_rate as f32).to_le_bytes());
            bin_payload.extend_from_slice(&analysis.cutoff_freq.to_le_bytes());
            
            let grade_bytes = quality_grade.as_bytes();
            bin_payload.extend_from_slice(&(grade_bytes.len() as u32).to_le_bytes());
            bin_payload.extend_from_slice(grade_bytes);

            // Add bits_per_channel
            bin_payload.extend_from_slice(&bits_per_channel.to_le_bytes());

            // Add new metrics
            bin_payload.extend_from_slice(&analysis.rolloff_95.to_le_bytes());
            bin_payload.extend_from_slice(&analysis.hf_ratio.to_le_bytes());
            bin_payload.extend_from_slice(&analysis.cliff_drop_db.to_le_bytes());
            
            for mag in compact_magnitudes {
                bin_payload.extend_from_slice(&mag.to_le_bytes());
            }

            let _ = self.app_handle.emit("audio-spectrum-bin", bin_payload);

            if emit_idx % 100 == 0 {
                println!("emit frame: {}", emit_idx);
            }
        }
    }

    fn analyze_quality(&self, magnitudes: &[f32], sample_rate: f64) -> AnalysisResult {
        if magnitudes.is_empty() {
            return AnalysisResult {
                cutoff_freq: 0.0,
                rolloff_95: 0.0,
                hf_ratio: 0.0,
                cliff_drop_db: 0.0,
            };
        }

        let bin_width = sample_rate / FFT_SIZE as f64;
        let mut smoothed = vec![0.0f32; magnitudes.len()];
        for i in 0..magnitudes.len() {
            let start = i.saturating_sub(4);
            let end = (i + 5).min(magnitudes.len());
            let span = &magnitudes[start..end];
            smoothed[i] = span.iter().copied().sum::<f32>() / span.len() as f32;
        }

        let mut smoothed_db = vec![0.0f32; smoothed.len()];
        for (i, p) in smoothed.iter().enumerate() {
            smoothed_db[i] = 10.0 * (p.max(1e-12)).log10();
        }

        let peak_db = smoothed_db
            .iter()
            .take(smoothed_db.len() * 4 / 5)
            .copied()
            .fold(-120.0f32, f32::max);

        let hf_start = smoothed_db.len() * 17 / 20;
        let hf_noise_db = if hf_start < smoothed_db.len() {
            let slice = &smoothed_db[hf_start..];
            slice.iter().copied().sum::<f32>() / slice.len() as f32
        } else {
            -120.0
        };

        let threshold_db = (hf_noise_db + 10.0).max(peak_db - 55.0).max(-95.0);
        let mut cutoff_bin = 0usize;
        for i in (0..smoothed_db.len()).rev() {
            if smoothed_db[i] > threshold_db {
                let left = i.saturating_sub(2);
                let right = (i + 3).min(smoothed_db.len());
                let local = &smoothed_db[left..right];
                let local_mean = local.iter().copied().sum::<f32>() / local.len() as f32;
                if local_mean > threshold_db - 2.5 {
                    cutoff_bin = i;
                    break;
                }
            }
        }

        let total_energy = smoothed.iter().copied().sum::<f32>().max(1e-12);
        let mut cumsum = 0.0f32;
        let mut rolloff_bin = 0usize;
        for (i, p) in smoothed.iter().enumerate() {
            cumsum += *p;
            if cumsum >= total_energy * 0.99 { // Relaxed to 99%
                rolloff_bin = i;
                break;
            }
        }

        let nyquist_bin = smoothed.len().saturating_sub(1);
        let hf_bin = ((20_000.0 / bin_width as f32) as usize).min(nyquist_bin);
        let hf_energy = if hf_bin < smoothed.len() {
            smoothed[hf_bin..].iter().copied().sum::<f32>()
        } else {
            0.0
        };
        let hf_ratio = hf_energy / total_energy;

        let mut cliff_drop_db = 0.0f32;
        let span = (1000.0 / bin_width as f32) as usize; // 1kHz span instead of 20 bins (~117Hz)
        if span > 0 && smoothed_db.len() > span {
            let start_bin = ((14_000.0 / bin_width as f32) as usize).min(smoothed_db.len().saturating_sub(span + 1));
            let end_bin = ((22_000.0 / bin_width as f32) as usize).min(smoothed_db.len().saturating_sub(span + 1));
            for i in start_bin..=end_bin {
                let drop = smoothed_db[i] - smoothed_db[i + span];
                if drop > cliff_drop_db {
                    cliff_drop_db = drop;
                }
            }
        }

        AnalysisResult {
            cutoff_freq: cutoff_bin as f32 * bin_width as f32,
            rolloff_95: rolloff_bin as f32 * bin_width as f32,
            hf_ratio,
            cliff_drop_db,
        }
    }

    fn stabilize_grade(&self, raw_level: u8) -> u8 {
        let mut state = self.grade_state.lock().unwrap();
        if raw_level >= state.level {
            state.level = raw_level;
            state.downgrade_streak = 0;
            return state.level;
        }

        state.downgrade_streak = state.downgrade_streak.saturating_add(1);
        if state.downgrade_streak >= 12 {
            state.level = raw_level;
            state.downgrade_streak = 0;
        }
        state.level
    }

    fn downsample_magnitudes(&self, magnitudes: &[f32], target_bins: usize) -> Vec<f32> {
        if magnitudes.is_empty() || target_bins == 0 {
            return Vec::new();
        }

        let mut result = Vec::with_capacity(target_bins);
        let chunk_size = (magnitudes.len() as f32 / target_bins as f32).ceil() as usize;

        for bin in 0..target_bins {
            let start = bin * chunk_size;
            if start >= magnitudes.len() {
                result.push(0.0);
                continue;
            }
            let end = (start + chunk_size).min(magnitudes.len());
            let chunk = &magnitudes[start..end];
            let avg = chunk.iter().copied().sum::<f32>() / chunk.len() as f32;
            
            // Adjusted dynamic range to prevent "thick/full" look.
            // Previous: +5.0 (100dB range). New: +3.0 (60dB range).
            // Signals below -60dB will be 0.
            let mut normalized = (avg.log10() + 3.0).max(0.0) / 3.0;
            // Power curve to push mids down further (visually less "full")
            normalized = normalized.powf(1.5);
            
            result.push(normalized.min(1.0));
        }

        result
    }
}

fn classify_quality_level(analysis: AnalysisResult) -> u8 {
    let mut level = if analysis.cutoff_freq >= 20000.0 {
        5
    } else if analysis.cutoff_freq >= 18000.0 {
        4
    } else if analysis.cutoff_freq >= 16000.0 {
        3
    } else if analysis.cutoff_freq >= 14000.0 {
        2
    } else {
        1
    };

    if analysis.rolloff_95 < 14_000.0 {
        level = level.min(2);
    } else if analysis.rolloff_95 < 16_000.0 {
        level = level.min(3);
    }

    if analysis.hf_ratio < 0.0001 && analysis.cutoff_freq > 18_000.0 {
        level = level.min(3);
    } else if analysis.hf_ratio < 0.0005 && analysis.cutoff_freq > 20_000.0 {
        level = level.min(4);
    }

    if analysis.cliff_drop_db > 30.0 {
        level = level.min(2);
    } else if analysis.cliff_drop_db > 20.0 {
        level = level.min(3);
    }

    level
}

fn grade_level_to_label(level: u8) -> &'static str {
    match level {
        5 => "REFERENCE",
        4 => "HIFI",
        3 => "CD",
        2 => "STREAMING",
        _ => "LOSSY",
    }
}

// Demo mode for non-macOS or testing
#[cfg(not(target_os = "macos"))]
pub fn start_demo_mode(app: AppHandle) {
    let app_handle = app.clone();
    tokio::spawn(async move {
        use std::time::Duration;
    use tokio::time::sleep;
    let mut t = 0.0;
    loop {
        // Generate fake spectrum data
        let mut magnitudes = Vec::with_capacity(64);
        for i in 0..64 {
            let val = (t * 5.0 + i as f32 * 0.5).sin() * 0.5 + 0.5;
            let noise = (t * 13.0 + i as f32 * 2.0).cos() * 0.2;
            let roll_off = if i > 40 { 1.0 - (i - 40) as f32 / 24.0 } else { 1.0 };
            magnitudes.push((val + noise).max(0.0) * roll_off);
        }

        let cutoff_freq = 16000.0 + (t.sin() * 4000.0).abs();
        let quality_grade = grade_level_to_label(classify_quality_level(AnalysisResult {
            cutoff_freq,
            rolloff_95: cutoff_freq,
            hf_ratio: 0.001,
            cliff_drop_db: 10.0,
        }))
        .to_string();
        let sample_rate = 48000.0f32;

        let mut bin_payload = Vec::new();
        bin_payload.extend_from_slice(&sample_rate.to_le_bytes());
        bin_payload.extend_from_slice(&cutoff_freq.to_le_bytes());
        
        let grade_bytes = quality_grade.as_bytes();
        bin_payload.extend_from_slice(&(grade_bytes.len() as u32).to_le_bytes());
        bin_payload.extend_from_slice(grade_bytes);
        
        // Add bits_per_channel for demo mode
        bin_payload.extend_from_slice(&32u32.to_le_bytes());

        // Add dummy metrics for demo mode
        bin_payload.extend_from_slice(&16000.0f32.to_le_bytes()); // rolloff_95
        bin_payload.extend_from_slice(&0.001f32.to_le_bytes());   // hf_ratio
        bin_payload.extend_from_slice(&5.0f32.to_le_bytes());     // cliff_drop_db
        
        for mag in magnitudes {
            bin_payload.extend_from_slice(&mag.to_le_bytes());
        }

        if let Err(_) = app_handle.emit("audio-spectrum-bin", bin_payload) {
            break;
        }

        t += 0.1;
        sleep(Duration::from_millis(50)).await;
    }
});
}

#[cfg(target_os = "macos")]
struct SCErrorHandlerImpl;

#[cfg(target_os = "macos")]
impl StreamErrorHandler for SCErrorHandlerImpl {
    fn on_error(&self) {
        eprintln!("SCStream Error: Stream failed or stopped unexpectedly!");
    }
}

#[cfg(target_os = "macos")]
struct SCOutputHandlerImpl {
    processor: Arc<AudioProcessor>,
}

#[cfg(target_os = "macos")]
impl StreamOutput for SCOutputHandlerImpl {
    fn did_output_sample_buffer(&self, sample: CMSampleBuffer, of_type: SCStreamOutputType) {
        match of_type {
            SCStreamOutputType::Screen => {
                // Do nothing for video frames
            }
            SCStreamOutputType::Audio => {
                let (sample_rate, bits_per_channel, float_format, signed_integer) = sample
                    .sys_ref
                    .get_format_description()
                    .and_then(|d| d.audio_format_description_get_stream_basic_description().map(|asbd| {
                        (
                            asbd.sample_rate,
                            asbd.bits_per_channel,
                            (asbd.format_flags & 1) != 0,
                            (asbd.format_flags & (1 << 2)) != 0,
                        )
                    }))
                    .map(|(sr, bits, is_float, is_signed)| (if sr > 0.0 { sr } else { 48_000.0 }, bits, is_float, is_signed))
                    .unwrap_or((48_000.0, 32, true, false));

                let copied_buffers = match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    sample.sys_ref.get_av_audio_buffer_list()
                })) {
                    Ok(v) => v,
                    Err(_) => return,
                };

                let mut has_data = false;
                for copied in copied_buffers {
                    let bytes = copied.data;
                    if bytes.is_empty() {
                        continue;
                    }
                    if bits_per_channel == 16 && signed_integer && bytes.len() % 2 == 0 {
                        let mut samples = Vec::with_capacity(bytes.len() / 2);
                        for chunk in bytes.chunks_exact(2) {
                            let s = i16::from_le_bytes([chunk[0], chunk[1]]);
                            samples.push(s as f32 / i16::MAX as f32);
                        }
                        if !samples.is_empty() {
                            self.processor.process_audio(&samples, sample_rate, bits_per_channel);
                            has_data = true;
                        }
                    } else if bits_per_channel == 32 && signed_integer && bytes.len() % 4 == 0 {
                        let mut samples = Vec::with_capacity(bytes.len() / 4);
                        for chunk in bytes.chunks_exact(4) {
                            let s = i32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
                            samples.push((s as f64 / i32::MAX as f64) as f32);
                        }
                        if !samples.is_empty() {
                            self.processor.process_audio(&samples, sample_rate, bits_per_channel);
                            has_data = true;
                        }
                    } else if float_format && bytes.len() % 4 == 0 {
                        let mut samples = Vec::with_capacity(bytes.len() / 4);
                        for chunk in bytes.chunks_exact(4) {
                            let v = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
                            if v.is_finite() {
                                samples.push(v);
                            }
                        }
                        if !samples.is_empty() {
                            self.processor.process_audio(&samples, sample_rate, 32); // Float usually 32-bit
                            has_data = true;
                        }
                    } else if bytes.len() % 2 == 0 {
                        let mut samples = Vec::with_capacity(bytes.len() / 2);
                        for chunk in bytes.chunks_exact(2) {
                            let s = i16::from_le_bytes([chunk[0], chunk[1]]);
                            samples.push(s as f32 / i16::MAX as f32);
                        }
                        if !samples.is_empty() {
                            self.processor.process_audio(&samples, sample_rate, 16); // Fallback
                            has_data = true;
                        }
                    }
                }

                if has_data {
                    use std::sync::atomic::{AtomicUsize, Ordering};
                    static LOG_COUNTER: AtomicUsize = AtomicUsize::new(0);
                    if LOG_COUNTER.fetch_add(1, Ordering::Relaxed) % 50 == 0 {
                        println!("Audio capture active: processing frame");
                    }
                }
            }
        }
    }
}

#[cfg(target_os = "macos")]
pub async fn start_real_capture(app: AppHandle) -> Result<(), String> {
    if CAPTURE_STARTED.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    println!("Starting real capture...");
    
    // Use try_current() to handle potential errors properly
    let content = SCShareableContent::try_current().map_err(|e| e.to_string())?;
    
    // Instead of picking just one display, let's try to capture everything to ensure system audio is included
    // System audio is often not bound to a specific display filter if excludes_current_process_audio is involved.
    // However, SCContentFilter requires a display, window, or applications.
    // InitParams::Display is the most common for "System Audio".
    
    // Find the main display (usually index 0 or id 1)
    let display = content.displays.first().ok_or("No display found")?;
    
    println!("Capturing audio via display: {} ({}x{})", display.display_id, display.width, display.height);

    let width = display.width;
    let height = display.height;

    // Create a filter that includes all windows and applications to be safe
    // This is often required for complete audio capture
    let filter = SCContentFilter::new(InitParams::Display(display.clone()));
    // Note: We might want to use excluding_applications/windows if we want to filter, but for now we want everything.
    
    // Absolute minimal config for audio-only capture
    let config = SCStreamConfiguration {
        width,
        height,
        captures_audio: true,
        sample_rate: 48_000,
        channel_count: 2,
        queue_depth: 8,
        excludes_current_process_audio: true,
        ..Default::default()
    };
    
    let processor = Arc::new(AudioProcessor::new(app.clone()));
    let output_handler = SCOutputHandlerImpl { processor };
    let error_handler = SCErrorHandlerImpl;
    
    let mut stream = SCStream::new(filter, config, error_handler);
    stream.add_output(output_handler, SCStreamOutputType::Audio);
    
    stream.start_capture().map_err(|e| e.to_string())?;
    
    println!("Capture started successfully");
    
    // Leak stream to keep it running
    Box::leak(Box::new(stream));
    
    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub async fn start_real_capture(app: AppHandle) -> Result<(), String> {
    start_demo_mode(app);
    Ok(())
}
