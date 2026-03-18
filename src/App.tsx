import { useState, useEffect, memo } from "react";
import { useAudioData } from "./hooks/useAudioData";
import { SpectrumVisualizer } from "./components/SpectrumVisualizer";
import { MetricCard } from "./components/MetricCard";
import { ThemeType, themes } from "./lib/themes";
import { cn } from "./lib/utils";
import { Waves, Info } from "lucide-react";
import { motion } from "framer-motion";

// Memoize App to prevent unnecessary re-renders from parent if any
const App = memo(function App() {
  const { fastDataRef, slowData } = useAudioData();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeType>("obsidian");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = themes[theme];
  const grade = slowData?.quality_grade ?? "LOSSY";
  
  const gradeMap = {
    REFERENCE: {
      label: "REFERENCE",
      status: "success" as const,
      description: "频谱响应 >20kHz，符合高解析度母带或无损升频特征，保留完整极高频信息。",
    },
    HIFI: {
      label: "HIFI",
      status: "success" as const,
      description: "频谱响应 18-20kHz，符合标准 Hi-Fi 音频特征，高频泛音细节保留完整。",
    },
    CD: {
      label: "CD",
      status: "neutral" as const,
      description: "频谱响应 16-18kHz，符合红皮书 CD 标准 (44.1kHz) 或高码率有损压缩特征。",
    },
    STREAMING: {
      label: "STREAMING",
      status: "warning" as const,
      description: "频谱响应 14-16kHz，符合典型流媒体编码 (AAC/MP3 256kbps+) 截止特征。",
    },
    LOSSY: {
      label: "LOSSY",
      status: "error" as const,
      description: "频谱响应 <14kHz，符合低码率有损压缩或低质量蓝牙传输特征，高频严重缺失。",
    },
  };
  const currentGrade = gradeMap[grade];
  const cutoff = slowData?.cutoff_freq ? (slowData.cutoff_freq / 1000).toFixed(1) : "0.0";
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
        </div>
      </header>

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
             <div className="absolute top-4 right-4 md:top-6 md:right-6 w-[200px] sm:w-[240px] md:w-[280px] pointer-events-none">
                 <div className={cn(
                     "rounded-xl border p-3 md:p-4 backdrop-blur-md flex flex-col gap-2 md:gap-3 transition-colors duration-300 shadow-lg",
                     currentTheme.colors.cardBg,
                     currentTheme.colors.cardBorder
                 )}>
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
                                     className={cn("h-full rounded-full", currentTheme.colors.accent.replace("text-", "bg-"))} 
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
                 </div>
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
                    title="Sample Rate" 
                    value={sampleRate} 
                    unit="kHz" 
                    status="neutral"
                    description="Output Rate"
                    className="h-full"
                    delay={0.2}
                    theme={currentTheme}
                  />
                  <MetricCard 
                    title="Expected" 
                    value={grade === "LOSSY" ? "<14k" : grade === "STREAMING" ? "14-16k" : grade === "CD" ? "16-18k" : grade === "HIFI" ? "18-20k" : ">20k"}
                    unit="Hz"
                    status="neutral"
                    description="Threshold"
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
