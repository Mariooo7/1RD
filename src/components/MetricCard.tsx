import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThemeConfig } from "@/lib/themes";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: "success" | "warning" | "error" | "neutral" | "custom";
  description?: string;
  className?: string;
  delay?: number;
  theme: ThemeConfig;
  customStyle?: string;
}

export function MetricCard({ 
  title, 
  value, 
  unit, 
  status = "neutral", 
  description,
  className,
  delay = 0,
  theme,
  customStyle
}: MetricCardProps) {
  const statusClasses = {
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    neutral: theme.colors.neutral,
    custom: customStyle || "",
  };

  const cardStyle = statusClasses[status] || theme.colors.cardBg + " " + theme.colors.cardBorder;

  // For non-neutral cards, we want the text to inherit the color of the status to make it pop
  const isHighlighted = status !== "neutral";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.3, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border p-4 md:p-5 flex flex-col justify-between transition-all duration-300",
        "backdrop-blur-xl relative overflow-hidden", // Lighter blur for performance and feel
        status === "neutral" ? `${theme.colors.cardBg} ${theme.colors.cardBorder} ${theme.colors.text}` : "",
        isHighlighted ? cardStyle : "",
        className
      )}
    >
      {/* Decorative background glow for highlighted cards */}
      {isHighlighted && (
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-current opacity-[0.08] rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="flex justify-between items-center mb-2 relative z-10">
        <span className={cn(
          "text-xs font-semibold uppercase tracking-widest opacity-80", 
          isHighlighted ? "opacity-90" : theme.colors.textSecondary
        )}>{title}</span>
        {status === "success" && <div className="w-2.5 h-2.5 rounded-full bg-current shadow-[0_0_12px_currentColor] animate-pulse shrink-0" />}
        {status === "warning" && <div className="w-2.5 h-2.5 rounded-full bg-current shadow-[0_0_12px_currentColor] shrink-0" />}
        {status === "error" && <div className="w-2.5 h-2.5 rounded-full bg-current shadow-[0_0_12px_currentColor] shrink-0" />}
      </div>
      
      <div className="flex-1 flex flex-col justify-center my-2 relative z-10">
        <div className="flex items-baseline gap-1.5 truncate">
          <span className={cn(
            "font-bold tracking-tighter truncate drop-shadow-sm", // Changed to bold for better legibility on colored backgrounds
            // Better dynamic sizing: Very long values get smaller
            typeof value === 'string' && value.length > 7 ? "text-3xl md:text-4xl" : 
            typeof value === 'string' && value.length > 4 ? "text-4xl md:text-5xl" : 
            "text-5xl md:text-6xl",
            isHighlighted ? "text-current" : theme.colors.text
          )}>{value}</span>
          {unit && <span className={cn("text-sm font-bold opacity-80 shrink-0", isHighlighted ? "text-current" : theme.colors.text)}>{unit}</span>}
        </div>
      </div>

      {description && (
        <p className={cn(
          "text-xs leading-relaxed font-medium mt-auto relative z-10", 
          isHighlighted ? "opacity-80" : "opacity-60 " + theme.colors.textSecondary
        )}>
          {description}
        </p>
      )}
    </motion.div>
  );
}
