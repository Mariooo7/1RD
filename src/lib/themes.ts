export type ThemeType = "obsidian" | "frost" | "crimson" | "ocean";

export interface ThemeConfig {
  id: ThemeType;
  label: string;
  colors: {
    bg: string;
    text: string;
    textSecondary: string;
    cardBg: string;
    cardBorder: string;
    accent: string;
    accentBg: string; // Add explicit background class for Tailwind
    gradientStart: string;
    gradientMiddle: string;
    gradientEnd: string;
    glowLeft: string;
    glowRight: string;
    gridLine: string;
    gridLabel: string;
    success: string;
    warning: string;
    error: string;
    neutral: string;
    grades: {
      reference: string;
      hifi: string;
      cd: string;
      streaming: string;
      lossy: string;
    };
  };
}

export const themes: Record<ThemeType, ThemeConfig> = {
  obsidian: {
    id: "obsidian",
    label: "Obsidian",
    colors: {
      bg: "bg-[#050505]",
      text: "text-zinc-50",
      textSecondary: "text-zinc-400",
      cardBg: "bg-zinc-900/40 backdrop-blur-xl", // Reduced blur/opacity for lighter feel
      cardBorder: "border-white/10",
      accent: "text-white",
      accentBg: "bg-white",
      gradientStart: "rgba(255, 255, 255, 0.9)",
      gradientMiddle: "rgba(255, 255, 255, 0.4)",
      gradientEnd: "rgba(255, 255, 255, 0.05)",
      glowLeft: "bg-zinc-600/20",
      glowRight: "bg-zinc-800/20",
      gridLine: "rgba(255, 255, 255, 0.08)",
      gridLabel: "rgba(255, 255, 255, 0.6)",
      // Refined status colors to be more harmonious with the Obsidian (Zinc) theme
      // Using muted, sophisticated tones instead of neon brights
      success: "text-emerald-300 border-emerald-500/30 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]",
      warning: "text-amber-300 border-amber-500/30 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]",
      error: "text-rose-300 border-rose-500/30 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]",
      neutral: "text-zinc-300 border-white/10 bg-white/5",
      grades: {
        reference: "text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-950/20 shadow-[0_0_15px_rgba(232,121,249,0.05)]",
        hifi: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20 shadow-[0_0_15px_rgba(52,211,153,0.05)]",
        cd: "text-sky-400 border-sky-500/30 bg-sky-950/20 shadow-[0_0_15px_rgba(56,189,248,0.05)]",
        streaming: "text-amber-400 border-amber-500/30 bg-amber-950/20 shadow-[0_0_15px_rgba(251,191,36,0.05)]",
        lossy: "text-rose-400 border-rose-500/30 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]",
      },
    },
  },
  frost: {
    id: "frost",
    label: "Frost",
    colors: {
      bg: "bg-[#f8fafc]", // Slightly brighter background
      text: "text-slate-900",
      textSecondary: "text-slate-500",
      cardBg: "bg-white/60 backdrop-blur-xl shadow-sm", // Lighter glass
      cardBorder: "border-slate-200/50",
      accent: "text-slate-900",
      accentBg: "bg-slate-900",
      gradientStart: "rgba(15, 23, 42, 0.8)",
      gradientMiddle: "rgba(15, 23, 42, 0.3)",
      gradientEnd: "rgba(15, 23, 42, 0.05)",
      glowLeft: "bg-blue-100/40",
      glowRight: "bg-indigo-100/40",
      gridLine: "rgba(0, 0, 0, 0.04)",
      gridLabel: "rgba(0, 0, 0, 0.6)",
      // Refined Frost colors: Softer pastels to match the light UI
      success: "text-emerald-700 border-emerald-200 bg-emerald-50/50 shadow-sm",
      warning: "text-amber-700 border-amber-200 bg-amber-50/50 shadow-sm",
      error: "text-rose-700 border-rose-200 bg-rose-50/50 shadow-sm",
      neutral: "text-slate-700 border-slate-200/60 bg-white/60",
      grades: {
        reference: "text-purple-700 border-purple-300 bg-purple-50/60 shadow-sm",
        hifi: "text-emerald-700 border-emerald-300 bg-emerald-50/60 shadow-sm",
        cd: "text-blue-700 border-blue-300 bg-blue-50/60 shadow-sm",
        streaming: "text-amber-700 border-amber-300 bg-amber-50/60 shadow-sm",
        lossy: "text-rose-700 border-rose-300 bg-rose-50/60 shadow-sm",
      },
    },
  },
  crimson: {
    id: "crimson",
    label: "Crimson",
    colors: {
      bg: "bg-[#0a0202]",
      text: "text-rose-50",
      textSecondary: "text-rose-200/70",
      cardBg: "bg-rose-950/30 backdrop-blur-xl",
      cardBorder: "border-rose-500/20",
      accent: "text-rose-400",
      accentBg: "bg-rose-400",
      gradientStart: "rgba(244, 63, 94, 0.9)",
      gradientMiddle: "rgba(225, 29, 72, 0.4)",
      gradientEnd: "rgba(159, 18, 57, 0.05)",
      glowLeft: "bg-rose-900/20",
      glowRight: "bg-red-950/20",
      gridLine: "rgba(244, 63, 94, 0.1)",
      gridLabel: "rgba(244, 63, 94, 0.5)",
      // Crimson tweaks: Reduce aggressiveness, more elegant deep red
      success: "text-rose-300 border-rose-500/30 bg-rose-900/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]", 
      warning: "text-orange-300 border-orange-500/30 bg-orange-950/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]",
      error: "text-red-300 border-red-500/30 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]",
      neutral: "text-rose-200 border-rose-500/10 bg-rose-900/10",
      grades: {
        reference: "text-rose-200 border-rose-400/40 bg-rose-900/40 shadow-[0_0_15px_rgba(244,63,94,0.1)]",
        hifi: "text-orange-200 border-orange-400/40 bg-orange-900/40 shadow-[0_0_15px_rgba(249,115,22,0.05)]",
        cd: "text-red-300 border-red-500/30 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]",
        streaming: "text-orange-400 border-orange-600/30 bg-orange-950/30 shadow-[0_0_15px_rgba(234,88,12,0.05)]",
        lossy: "text-red-500 border-red-700/30 bg-red-950/20 shadow-[0_0_15px_rgba(185,28,28,0.05)]",
      },
    },
  },
  ocean: {
    id: "ocean",
    label: "Ocean",
    colors: {
      bg: "bg-[#020617]",
      text: "text-sky-50",
      textSecondary: "text-sky-200/70",
      cardBg: "bg-slate-900/40 backdrop-blur-xl",
      cardBorder: "border-sky-500/20",
      accent: "text-sky-400",
      accentBg: "bg-sky-400",
      gradientStart: "rgba(56, 189, 248, 0.9)",
      gradientMiddle: "rgba(14, 165, 233, 0.4)",
      gradientEnd: "rgba(3, 105, 161, 0.05)",
      glowLeft: "bg-sky-900/20",
      glowRight: "bg-indigo-900/20",
      gridLine: "rgba(56, 189, 248, 0.1)",
      gridLabel: "rgba(56, 189, 248, 0.5)",
      // Ocean tweaks: More aquatic/cyan tints
      success: "text-sky-300 border-sky-500/30 bg-sky-900/20 shadow-[0_0_15px_rgba(56,189,248,0.05)]", 
      warning: "text-indigo-300 border-indigo-500/30 bg-indigo-900/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]",
      error: "text-blue-300 border-blue-500/30 bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]",
      neutral: "text-sky-200 border-sky-500/20 bg-slate-800/30",
      grades: {
        reference: "text-indigo-300 border-indigo-400/30 bg-indigo-900/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]",
        hifi: "text-cyan-300 border-cyan-400/30 bg-cyan-900/30 shadow-[0_0_15px_rgba(34,211,238,0.05)]",
        cd: "text-sky-300 border-sky-400/30 bg-sky-900/30 shadow-[0_0_15px_rgba(56,189,248,0.05)]",
        streaming: "text-blue-400 border-blue-500/30 bg-blue-950/30 shadow-[0_0_15px_rgba(59,130,246,0.05)]",
        lossy: "text-slate-400 border-slate-500/30 bg-slate-900/30 shadow-[0_0_15px_rgba(148,163,184,0.05)]",
      },
    },
  },
};
