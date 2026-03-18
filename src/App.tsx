import { useState, useEffect, memo } from "react";
import { useAudioData } from "./hooks/useAudioData";
import { SpectrumVisualizer } from "./components/SpectrumVisualizer";
import { MetricCard } from "./components/MetricCard";
import { ThemeType, themes } from "./lib/themes";
import { cn } from "./lib/utils";
import { Waves, Info, BookOpen, X, EyeOff, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Memoize App to prevent unnecessary re-renders from parent if any
const App = memo(function App() {
  const { fastDataRef, slowData } = useAudioData();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeType>("obsidian");
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = themes[theme];
  const grade = slowData?.quality_grade ?? "LOSSY";
  
  const gradeMap = {
    REFERENCE: {
      label: "REFERENCE",
      status: "custom" as const,
      style: currentTheme.colors.grades.reference,
      description: "频谱响应 >20kHz，符合高解析度母带或无损升频特征，保留完整极高频信息。",
    },
    HIFI: {
      label: "HIFI",
      status: "custom" as const,
      style: currentTheme.colors.grades.hifi,
      description: "频谱响应 18-20kHz，符合标准 Hi-Fi 音频特征，高频泛音细节保留完整。",
    },
    CD: {
      label: "CD",
      status: "custom" as const,
      style: currentTheme.colors.grades.cd,
      description: "频谱响应 16-18kHz，符合红皮书 CD 标准 (44.1kHz) 或高码率有损压缩特征。",
    },
    STREAMING: {
      label: "STREAMING",
      status: "custom" as const,
      style: currentTheme.colors.grades.streaming,
      description: "频谱响应 14-16kHz，符合典型流媒体编码 (AAC/MP3 256kbps+) 截止特征。",
    },
    LOSSY: {
      label: "LOSSY",
      status: "custom" as const,
      style: currentTheme.colors.grades.lossy,
      description: "频谱响应 <14kHz，符合低码率有损压缩或低质量蓝牙传输特征，高频严重缺失。",
    },
  };
  const currentGrade = gradeMap[grade];
  const cutoff = slowData?.cutoff_freq ? (slowData.cutoff_freq / 1000).toFixed(1) : "0.0";
  // Sample rate and bits are still useful for debugging system output, but we might hide them if user insists.
  // User asked if they are meaningful. They are meaningful to show SYSTEM output, not source file.
  // We will keep them but maybe deemphasize them or add tooltip later.
  // User asked about "Expected" card content.
  const sampleRate = slowData?.sample_rate ? (slowData.sample_rate / 1000).toFixed(1) : "-";
  const bits = slowData?.bits_per_channel ? slowData.bits_per_channel.toString() : "-";
  
  // New metrics
  const rolloff = slowData?.rolloff_95 ? (slowData.rolloff_95 / 1000).toFixed(1) : "0.0";
  const hfRatio = slowData?.hf_ratio ? (slowData.hf_ratio * 10000).toFixed(1) : "0";
  const cliffDrop = slowData?.cliff_drop_db ? slowData.cliff_drop_db.toFixed(1) : "0.0";

  return (
    <div className={cn(
      "h-screen w-screen overflow-hidden bg-transparent flex flex-col font-sans selection:bg-pink-500/30 transition-colors duration-300",
      currentTheme.colors.text
    )}>
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-noise opacity-[0.03] pointer-events-none z-0 mix-blend-overlay" />
      <div className={cn("fixed top-[-20%] left-[-20%] w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-40 pointer-events-none transition-colors duration-700 bg-radial-gradient z-0", currentTheme.colors.glowLeft)} />
      <div className={cn("fixed bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-40 pointer-events-none transition-colors duration-700 bg-radial-gradient z-0", currentTheme.colors.glowRight)} />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.05]" style={{ backgroundImage: `linear-gradient(${currentTheme.colors.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${currentTheme.colors.gridLine} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      <header className="flex-none px-6 py-4 flex items-center justify-between relative z-50" data-tauri-drag-region>
        <div className="flex items-center gap-3 pointer-events-none">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-colors duration-300 backdrop-blur-md",
            currentTheme.colors.cardBg,
            currentTheme.colors.cardBorder
          )}>
            <Waves className={cn("w-5 h-5", currentTheme.colors.accent)} />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className={cn("text-lg font-bold tracking-tight", currentTheme.colors.text)}>
              fuckHiFi
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Switcher */}
          <div 
            className={cn(
              "flex items-center p-1 rounded-lg border backdrop-blur-md transition-all duration-300",
              currentTheme.colors.cardBg,
              currentTheme.colors.cardBorder
            )}
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {(Object.keys(themes) as ThemeType[]).map((t) => (
              <button
                key={t}
                onClick={(e) => {
                  e.stopPropagation();
                  setTheme(t);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 relative z-10",
                  theme === t 
                    ? `${currentTheme.colors.text} bg-white/10 shadow-sm` 
                    : `${currentTheme.colors.textSecondary} hover:text-white/80 hover:bg-white/5`
                )}
              >
                {themes[t].label}
              </button>
            ))}
          </div>

          <div 
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-md transition-colors duration-300 flex items-center gap-2",
              currentTheme.colors.success
            )}
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span className="tracking-wide">LIVE</span>
          </div>

          <button
            onClick={() => setShowDocs(true)}
            className={cn(
              "p-2 rounded-lg border backdrop-blur-md transition-all duration-200",
              currentTheme.colors.cardBg,
              currentTheme.colors.cardBorder,
              `${currentTheme.colors.textSecondary} hover:text-white/80 hover:bg-white/5`
            )}
            style={{ WebkitAppRegion: "no-drag" } as any}
            title="Documentation & Algorithm Logic"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Documentation Modal */}
      <AnimatePresence>
        {showDocs && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ WebkitAppRegion: "no-drag" } as any}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowDocs(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border shadow-2xl flex flex-col pointer-events-auto",
                currentTheme.colors.cardBg,
                currentTheme.colors.cardBorder,
                currentTheme.colors.text
              )}
            >
              <div className={cn(
                "sticky top-0 p-4 sm:p-6 border-b flex justify-between items-center z-10 backdrop-blur-2xl",
                currentTheme.colors.cardBorder,
                // Add a solid fallback background with high opacity for the header to ensure text is readable
                "bg-zinc-950/80"
              )}>
                <div className="flex items-center gap-3">
                  <BookOpen className={cn("w-6 h-6", currentTheme.colors.accent)} />
                  <h2 className="text-xl font-bold tracking-tight drop-shadow-md text-white">技术规格与算法白皮书</h2>
                </div>
                <button 
                  onClick={() => setShowDocs(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors bg-white/5"
                >
                  <X className="w-5 h-5 opacity-90" />
                </button>
              </div>

              <div className={cn(
                "p-4 sm:p-6 space-y-10 text-sm leading-relaxed",
                currentTheme.colors.text
              )}>
                <section className="space-y-4">
                  <h3 className={cn("text-xl font-bold tracking-tight border-b border-current pb-2 mb-3", currentTheme.colors.accent)}>一. 数据来源与处理流程</h3>
                  <div className={cn("space-y-4 text-[13px] md:text-sm", currentTheme.colors.textSecondary)}>
                    <p>
                      本应用实时分析的是系统当前正在输出的音频流。数据来自 macOS 音频链路的输出端，代表最终送往 DAC/声卡的信号形态。
                    </p>
                    <p>
                      后端通过 ScreenCaptureKit 获取音频缓冲，按帧执行 DSP 计算，再将结果以二进制事件推送到前端。界面显示的是“实时频谱 + 统计指标 + 综合分级”，重点是帮助用户理解当前听到的声音在频域上的实际质量。
                    </p>
                    <div className="bg-black/10 dark:bg-white/5 p-4 rounded-xl border border-current font-mono text-xs md:text-sm opacity-90">
                      <div className="mb-2 opacity-70">DSP 处理管线 (Pipeline):</div>
                      <ol className="list-decimal list-inside space-y-1.5 ml-2">
                        <li><strong className={currentTheme.colors.text}>音频捕获</strong>: 读取系统输出缓冲，得到当前播放的 PCM 流。</li>
                        <li><strong className={currentTheme.colors.text}>加窗处理</strong>: 每帧乘以 Hann Window，降低分帧边界造成的频谱泄漏。</li>
                        <li><strong className={currentTheme.colors.text}>频域转换</strong>: 执行 8192 点 FFT；48kHz 下频点间隔约 5.86Hz，足够观察高频截止和断层。</li>
                        <li><strong className={currentTheme.colors.text}>特征提取</strong>: 从频谱计算 Cutoff、Rolloff、HF Ratio、Cliff Drop 等指标。</li>
                        <li><strong className={currentTheme.colors.text}>稳定化</strong>: 使用会话峰值窗口与静音重置，抑制瞬时波动，提升读数一致性。</li>
                      </ol>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className={cn("text-xl font-bold tracking-tight border-b border-current pb-2 mb-3", currentTheme.colors.accent)}>二. 指标定义与本应用解释</h3>
                  <div className="space-y-5">
                    
                    {/* Indicator 1 */}
                    <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-current opacity-90">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("w-2 h-2 rounded-full", currentTheme.colors.accentBg)}></div>
                        <h4 className={cn("font-bold text-base", currentTheme.colors.text)}>Cutoff Frequency (高频截止点)</h4>
                      </div>
                      <div className={cn("text-[13px] md:text-sm space-y-2", currentTheme.colors.textSecondary)}>
                        <p><strong className={currentTheme.colors.text}>定义：</strong>频谱中可观测有效能量的最高频率边界。</p>
                        <p><strong className={currentTheme.colors.text}>本应用解释：</strong>从高频向低频扫描，定位能量连续衰减到低阈值后的转折点。该值越高，通常表示高频延伸越完整；若长期停在 14-16kHz，常见于有损编码或链路限频。</p>
                      </div>
                    </div>

                    {/* Indicator 2 */}
                    <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-current opacity-90">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("w-2 h-2 rounded-full", currentTheme.colors.accentBg)}></div>
                        <h4 className={cn("font-bold text-base", currentTheme.colors.text)}>Rolloff 99% (有效能量频宽)</h4>
                      </div>
                      <div className={cn("text-[13px] md:text-sm space-y-2", currentTheme.colors.textSecondary)}>
                        <p><strong className={currentTheme.colors.text}>定义：</strong>累计能量达到总能量 99% 时对应的频率。</p>
                        <p><strong className={currentTheme.colors.text}>本应用解释：</strong>先计算频段能量累积和，再找 99% 分位点。该指标能区分“高截止但高频能量很少”的情况；若 Cutoff 很高而 Rolloff 明显偏低，说明高频部分可能主要是弱噪声而非有效音乐内容。</p>
                      </div>
                    </div>

                    {/* Indicator 3 */}
                    <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-current opacity-90">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("w-2 h-2 rounded-full", currentTheme.colors.accentBg)}></div>
                        <h4 className={cn("font-bold text-base", currentTheme.colors.text)}>HF Energy Ratio (高频能量比)</h4>
                      </div>
                      <div className={cn("text-[13px] md:text-sm space-y-2", currentTheme.colors.textSecondary)}>
                        <p><strong className={currentTheme.colors.text}>定义：</strong>20kHz 以上能量占总能量的比例（单位：‱）。</p>
                        <p><strong className={currentTheme.colors.text}>本应用解释：</strong>用于衡量超高频是否“有量且稳定”。该值长期接近 0 时，说明高频信息非常少；结合 Cutoff/Rolloff 一起看，比单看“采样率标签”更能反映实际听感相关信息。</p>
                      </div>
                    </div>

                    {/* Indicator 4 */}
                    <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-current opacity-90">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("w-2 h-2 rounded-full", currentTheme.colors.accentBg)}></div>
                        <h4 className={cn("font-bold text-base", currentTheme.colors.text)}>Cliff Drop (频谱断层)</h4>
                      </div>
                      <div className={cn("text-[13px] md:text-sm space-y-2", currentTheme.colors.textSecondary)}>
                        <p><strong className={currentTheme.colors.text}>定义：</strong>在固定 1kHz 跨度内检测到的最大能量跌落（dB）。</p>
                        <p><strong className={currentTheme.colors.text}>本应用解释：</strong>扫描 14kHz-22kHz 区间，寻找“陡降段”。数值越大，越可能存在编码低通带来的硬切边缘；数值较小通常对应更平滑的自然衰减。</p>
                      </div>
                    </div>

                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className={cn("text-xl font-bold tracking-tight border-b border-current pb-2 mb-3", currentTheme.colors.accent)}>三. 分级规则与判定方式</h3>
                  <p className={cn("text-[13px] md:text-sm mb-3", currentTheme.colors.textSecondary)}>分级由多个指标联合决定。系统按持续采样结果更新等级，避免单帧异常直接跳级。下列区间用于表达当前播放链路的频域质量状态：</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={cn("p-4 rounded-xl border relative overflow-hidden group", currentTheme.colors.grades.reference)}>
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-current opacity-50"></div>
                      <div className="font-bold mb-1 text-lg">REFERENCE</div>
                      <ul className="text-xs space-y-1 list-disc list-inside opacity-90">
                        <li>Cutoff &gt; 20kHz</li>
                        <li>Rolloff &gt; 19kHz</li>
                        <li>HF Ratio 处于健康阈值</li>
                        <li>无 Cliff Drop 断层特征</li>
                      </ul>
                    </div>

                    <div className={cn("p-4 rounded-xl border relative overflow-hidden group", currentTheme.colors.grades.hifi)}>
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-current opacity-50"></div>
                      <div className="font-bold mb-1 text-lg">HIFI</div>
                      <ul className="text-xs space-y-1 list-disc list-inside opacity-90">
                        <li>Cutoff &gt; 18kHz</li>
                        <li>Rolloff &gt; 16kHz</li>
                        <li>未检出严重的人工重采样痕迹</li>
                      </ul>
                    </div>

                    <div className={cn("p-4 rounded-xl border relative overflow-hidden group", currentTheme.colors.grades.cd)}>
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-current opacity-50"></div>
                      <div className="font-bold mb-1 text-lg">CD</div>
                      <ul className="text-xs space-y-1 list-disc list-inside opacity-90">
                        <li>Cutoff 位于 16-18kHz 之间</li>
                        <li>符合 44.1kHz 标准采样率的奈奎斯特极限</li>
                      </ul>
                    </div>

                    <div className={cn("p-4 rounded-xl border relative overflow-hidden group", currentTheme.colors.grades.streaming)}>
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-current opacity-50"></div>
                      <div className="font-bold mb-1 text-lg">STREAMING</div>
                      <ul className="text-xs space-y-1 list-disc list-inside opacity-90">
                        <li>Cutoff 位于 14-16kHz 之间</li>
                        <li>或者检出 20dB-30dB 的轻度滤波断层</li>
                      </ul>
                    </div>

                    <div className={cn("p-4 rounded-xl border relative overflow-hidden group sm:col-span-2", currentTheme.colors.grades.lossy)}>
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-current opacity-50"></div>
                      <div className="font-bold mb-1 text-lg">LOSSY</div>
                      <ul className="text-xs space-y-1 list-disc list-inside opacity-90">
                        <li>Cutoff &lt; 14kHz</li>
                        <li>或者检出 &gt;30dB 的暴力悬崖式断层</li>
                        <li>高频声学信息发生实质性损坏</li>
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Layout - Responsive Grid/Flex */}
      <main className="flex-1 min-h-0 relative z-10 p-4 md:p-6 pt-0 overflow-y-auto lg:overflow-hidden no-scrollbar">
        <div className="w-full min-h-full max-w-[1600px] mx-auto flex flex-col lg:grid lg:grid-cols-[1fr_340px] gap-6">
          
          {/* Visualizer Panel */}
          <div className={cn(
            "relative w-full h-[400px] lg:h-full min-h-[400px] lg:min-h-0 rounded-2xl overflow-hidden shadow-2xl border backdrop-blur-2xl transition-colors duration-300 flex flex-col shrink-0",
            currentTheme.colors.cardBorder,
            currentTheme.colors.cardBg
          )}>
             <div className="absolute top-0 left-0 w-full h-full">
                <SpectrumVisualizer fastDataRef={fastDataRef} className="w-full h-full" theme={currentTheme} />
             </div>

             {/* Advanced Analysis Panel (Overlay Legend) */}
             <div className="absolute top-4 right-4 md:top-6 md:right-6 pointer-events-none flex flex-col items-end">
                 <button
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className={cn(
                        "pointer-events-auto mb-2 p-1.5 rounded-lg border backdrop-blur-md transition-all duration-200 opacity-70 hover:opacity-100",
                        currentTheme.colors.cardBg,
                        currentTheme.colors.cardBorder,
                        currentTheme.colors.text
                    )}
                 >
                    {showAnalysis ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                 </button>
                 
                 <AnimatePresence>
                   {showAnalysis && (
                     <motion.div 
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                         transition={{ duration: 0.15, ease: "easeOut" }}
                         className={cn(
                             "w-[200px] sm:w-[240px] md:w-[280px] rounded-xl border p-3 md:p-4 backdrop-blur-md flex flex-col gap-2 md:gap-3 shadow-lg origin-top-right",
                             currentTheme.colors.cardBg,
                             currentTheme.colors.cardBorder
                         )}
                     >
                         <div className="flex items-center justify-between mb-1">
                             <h3 className={cn("text-[10px] font-bold uppercase tracking-widest opacity-70", currentTheme.colors.textSecondary)}>Spectrum Analysis</h3>
                             <Info className={cn("w-3 h-3 opacity-50", currentTheme.colors.text)} />
                         </div>

                         <div className="space-y-4">
                             {/* Metric Row 1 */}
                             <div className="space-y-1.5">
                                 <div className="flex justify-between items-center">
                                     <span className={cn("text-[10px] font-medium opacity-60", currentTheme.colors.text)}>Rolloff (99%)</span>
                                     <span className={cn("text-xs font-mono font-bold", currentTheme.colors.text)}>{rolloff} kHz</span>
                                 </div>
                                 <div className="h-1 w-full bg-black/10 rounded-full overflow-hidden">
                                     <motion.div 
                                         className={cn("h-full rounded-full", currentTheme.colors.accentBg)} 
                                         animate={{ width: `${Math.min(100, (parseFloat(rolloff) / 22.0) * 100)}%` }}
                                         transition={{ duration: 0.2, ease: "easeOut" }}
                                     />
                                 </div>
                             </div>

                             {/* Metric Row 2 */}
                             <div className="space-y-1.5">
                                 <div className="flex justify-between items-center">
                                     <span className={cn("text-[10px] font-medium opacity-60", currentTheme.colors.text)}>HF Energy Ratio</span>
                                     <span className={cn("text-xs font-mono font-bold", currentTheme.colors.text)}>{hfRatio} ‱</span>
                                 </div>
                                 <div className="h-1 w-full bg-black/10 rounded-full overflow-hidden">
                                     <motion.div 
                                         className={cn("h-full rounded-full", parseFloat(hfRatio) > 5 ? "bg-emerald-400" : "bg-rose-400")} 
                                         animate={{ width: `${Math.min(100, parseFloat(hfRatio) * 5)}%` }}
                                         transition={{ duration: 0.2, ease: "easeOut" }}
                                     />
                                 </div>
                             </div>

                             {/* Metric Row 3 */}
                             <div className="space-y-1.5">
                                 <div className="flex justify-between items-center">
                                     <span className={cn("text-[10px] font-medium opacity-60", currentTheme.colors.text)}>Cliff Drop</span>
                                     <span className={cn("text-xs font-mono font-bold", currentTheme.colors.text)}>{cliffDrop} dB</span>
                                 </div>
                                 <div className="h-1 w-full bg-black/10 rounded-full overflow-hidden">
                                     <motion.div 
                                         className={cn("h-full rounded-full", parseFloat(cliffDrop) > 20 ? "bg-rose-500" : "bg-emerald-500")} 
                                         animate={{ width: `${Math.min(100, (parseFloat(cliffDrop) / 40.0) * 100)}%` }}
                                         transition={{ duration: 0.2, ease: "easeOut" }}
                                     />
                                 </div>
                             </div>
                         </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
             </div>
          </div>

          {/* Sidebar - Original Layout */}
          <div className="flex flex-col gap-4 lg:h-full pb-6 lg:pb-2 shrink-0">
              {/* Grade Card */}
              <div className="flex-none lg:flex-1 min-h-[160px]">
                <MetricCard 
                  title="Quality Grade" 
                  value={currentGrade.label}
                  status={currentGrade.status}
                  customStyle={currentGrade.style}
                  description={currentGrade.description}
                  className="h-full"
                  delay={0}
                  theme={currentTheme}
                />
              </div>

              {/* Basic Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 flex-none lg:flex-1 min-h-[200px]">
                  <MetricCard 
                    title="Cutoff" 
                    value={cutoff} 
                    unit="kHz" 
                    status="neutral"
                    description="Rolloff Point"
                    className="h-full"
                    delay={0.1}
                    theme={currentTheme}
                  />
                  <MetricCard 
                    title="Bit Depth" 
                    value={bits} 
                    unit="bit" 
                    status="neutral"
                    description="Output Depth"
                    className="h-full"
                    delay={0.1}
                    theme={currentTheme}
                  />
                  <MetricCard 
                    title="Output Rate" 
                    value={sampleRate} 
                    unit="kHz" 
                    status="neutral"
                    description="System Output"
                    className="h-full"
                    delay={0.2}
                    theme={currentTheme}
                  />
                  <MetricCard 
                    title="Expected" 
                    value={grade === "LOSSY" ? "<14k" : grade === "STREAMING" ? "14-16k" : grade === "CD" ? "16-18k" : grade === "HIFI" ? "18-20k" : ">20k"}
                    unit="Hz"
                    status="neutral"
                    description="Cutoff Threshold"
                    className="h-full"
                    delay={0.2}
                    theme={currentTheme}
                  />
              </div>
          </div>
        </div>
      </main>
    </div>
  );
});

export default App;
