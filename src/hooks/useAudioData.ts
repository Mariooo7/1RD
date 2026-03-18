import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export interface SpectrumPayload {
  magnitudes: number[];
  cutoff_freq: number;
  sample_rate: number;
  quality_grade: "REFERENCE" | "HIFI" | "CD" | "STREAMING" | "LOSSY";
  bits_per_channel: number;
  rolloff_95: number;
  hf_ratio: number;
  cliff_drop_db: number;
}

export interface AudioDebugState {
  received: number;
  decoded: number;
  dropped: number;
  payloadKind: string;
  lastReason: string;
}

function toUint8Array(payload: unknown): Uint8Array | null {
  if (payload instanceof Uint8Array) {
    return payload;
  }
  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload);
  }
  if (Array.isArray(payload) && payload.every((n) => typeof n === "number")) {
    return Uint8Array.from(payload);
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data) && data.every((n) => typeof n === "number")) {
      return Uint8Array.from(data);
    }
  }
  return null;
}

export function useAudioData() {
  // We keep slow updating metrics in state to trigger re-renders only occasionally
  const [slowData, setSlowData] = useState<Omit<SpectrumPayload, 'magnitudes'> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<AudioDebugState>({
    received: 0,
    decoded: 0,
    dropped: 0,
    payloadKind: "unknown",
    lastReason: "",
  });

  // Fast updating magnitudes and instantaneous values are kept in a ref to avoid React re-renders
  const fastDataRef = useRef<SpectrumPayload | null>(null);
  
  // Smoothing state for metrics
  const smoothingStateRef = useRef({
    lastUpdateTime: 0,
    // Store history of values for "Max Hold" logic instead of simple averaging
    cutoffHistory: [] as number[],
    sampleRateHistory: [] as number[],
    gradeHistory: [] as string[],
    bitsHistory: [] as number[],
    // Track new metrics
    rolloffHistory: [] as number[],
    hfRatioHistory: [] as number[],
    cliffDropHistory: [] as number[],
    // Track if we are receiving real audio data or silence
    lastActiveTime: 0, 
  });

  useEffect(() => {
    let unlisten: () => void;

    const setupListener = async () => {
      try {
        await invoke("start_capture");
        setIsConnected(true);
        setError(null);

        const unlistenFn = await listen<unknown>("audio-spectrum-bin", (event) => {
          try {
            let payloadKind: string = typeof event.payload;
            if (event.payload instanceof Uint8Array) payloadKind = "Uint8Array";
            else if (event.payload instanceof ArrayBuffer) payloadKind = "ArrayBuffer";
            else if (Array.isArray(event.payload)) payloadKind = "number[]";
            else if (event.payload && typeof event.payload === "object" && "data" in event.payload) payloadKind = "object.data";

            // Only update debug state occasionally to prevent too many re-renders
            const now = performance.now();
            
            const buffer = toUint8Array(event.payload);
            if (!buffer) {
              return;
            }
            if (buffer.byteLength < 16) { // Minimum length increased due to extra field
              return;
            }

            const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            const sample_rate = view.getFloat32(0, true);
            const cutoff_freq = view.getFloat32(4, true);
            const grade_len = view.getUint32(8, true);
            
            // Validate grade_len to prevent OOB
            if (12 + grade_len + 4 > buffer.byteLength) {
                return;
            }

            const decoder = new TextDecoder("utf-8");
            const grade_bytes = new Uint8Array(buffer.buffer, buffer.byteOffset + 12, grade_len);
            const quality_grade = decoder.decode(grade_bytes) as SpectrumPayload["quality_grade"];
            
            // New field: bits_per_channel at 12 + grade_len
            const bits_offset = 12 + grade_len;
            const bits_per_channel = view.getUint32(bits_offset, true);

            // New metrics: rolloff_95 (f32), hf_ratio (f32), cliff_drop_db (f32)
            const rolloff_offset = bits_offset + 4;
            const rolloff_95 = view.getFloat32(rolloff_offset, true);
            const hf_ratio = view.getFloat32(rolloff_offset + 4, true);
            const cliff_drop_db = view.getFloat32(rolloff_offset + 8, true);

            const mags_offset = rolloff_offset + 12;

            if (mags_offset > buffer.byteLength || (buffer.byteLength - mags_offset) % 4 !== 0) {
              return;
            }

            const num_mags = (buffer.byteLength - mags_offset) / 4;
            const magnitudes = new Array<number>(num_mags);
            let hasSignal = false;
            for (let i = 0; i < num_mags; i++) {
              const val = view.getFloat32(mags_offset + i * 4, true);
              magnitudes[i] = val;
              if (val > 0.001) hasSignal = true; // Simple silence check
            }

            const newData = {
              sample_rate,
              cutoff_freq,
              quality_grade,
              bits_per_channel,
              rolloff_95,
              hf_ratio,
              cliff_drop_db,
              magnitudes,
            };

            // 1. Update ref immediately for canvas
            fastDataRef.current = newData;

            // 2. Accumulate metrics for smoothing
            const s = smoothingStateRef.current;
            
            // Only push to history if there is signal
            if (hasSignal) {
                // If we were idle for more than 2 seconds, clear history (New Session/Song)
                if (now - s.lastActiveTime > 2000) {
                    s.cutoffHistory = [];
                    s.sampleRateHistory = [];
                    s.gradeHistory = [];
                    s.bitsHistory = [];
                    s.rolloffHistory = [];
                    s.hfRatioHistory = [];
                    s.cliffDropHistory = [];
                }
                s.lastActiveTime = now;
                
                s.cutoffHistory.push(cutoff_freq);
                s.sampleRateHistory.push(sample_rate);
                s.gradeHistory.push(quality_grade);
                s.bitsHistory.push(bits_per_channel);
                s.rolloffHistory.push(rolloff_95);
                s.hfRatioHistory.push(hf_ratio);
                s.cliffDropHistory.push(cliff_drop_db);
            }
            
            // Limit history size. 
            // Increase window to ~10 seconds (200 frames) to hold the "Session Peak"
            // This ensures that if a song hits HiFi once, it stays HiFi for the duration of the buffer
            if (s.cutoffHistory.length > 200) {
                s.cutoffHistory.shift();
                s.sampleRateHistory.shift();
                s.gradeHistory.shift();
                s.bitsHistory.shift();
                s.rolloffHistory.shift();
                s.hfRatioHistory.shift();
                s.cliffDropHistory.shift();
            }

            // 3. Commit metrics to React state every 200ms
            if (now - s.lastUpdateTime > 200) {
              // Check if idle (no signal for > 3 seconds)
              const isIdle = (now - s.lastActiveTime) > 3000;

              if (isIdle) {
                  setSlowData({
                    cutoff_freq: 0,
                    sample_rate: 0,
                    quality_grade: "LOSSY",
                    bits_per_channel: 0,
                    rolloff_95: 0,
                    hf_ratio: 0,
                    cliff_drop_db: 0,
                  });
              } else if (s.cutoffHistory.length > 0) {
                  const maxCutoff = Math.max(...s.cutoffHistory);
                  const maxSampleRate = Math.max(...s.sampleRateHistory);
                  const maxBits = Math.max(...s.bitsHistory);
                  const maxRolloff = Math.max(...s.rolloffHistory);
                  const avgHfRatio = s.hfRatioHistory.reduce((a, b) => a + b, 0) / s.hfRatioHistory.length;
                  const avgCliffDrop = s.cliffDropHistory.reduce((a, b) => a + b, 0) / s.cliffDropHistory.length;
                  
                  // Grade priority
                  const gradePriority = { "REFERENCE": 5, "HIFI": 4, "CD": 3, "STREAMING": 2, "LOSSY": 1 };
                  let bestGrade = "LOSSY";
                  let maxPriority = 0;
                  
                  for (const g of s.gradeHistory) {
                      const p = gradePriority[g as keyof typeof gradePriority] || 0;
                      if (p > maxPriority) {
                          maxPriority = p;
                          bestGrade = g;
                      }
                  }

                  setSlowData({
                    cutoff_freq: maxCutoff,
                    sample_rate: maxSampleRate,
                    quality_grade: bestGrade as SpectrumPayload["quality_grade"],
                    bits_per_channel: maxBits,
                    rolloff_95: maxRolloff,
                    hf_ratio: avgHfRatio,
                    cliff_drop_db: avgCliffDrop,
                  });
              }

              setDebug((prev) => ({
                ...prev,
                received: prev.received + 1,
                decoded: prev.decoded + 1,
                payloadKind,
                lastReason: "",
              }));

              // Do NOT reset accumulator, just update time. 
              // This creates a rolling window rather than chunked windows.
              s.lastUpdateTime = now;
            }

            if (!isConnected) setIsConnected(true);
          } catch (e) {
            // Ignore parse errors to keep stream fast, optionally log
          }
        });
        unlisten = unlistenFn;
      } catch (err) {
        console.error("Failed to setup audio listener:", err);
        setError(typeof err === 'string' ? err : JSON.stringify(err));
        setIsConnected(false);
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [isConnected]);

  return { fastDataRef, slowData, isConnected, error, debug };
}
