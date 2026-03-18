import { useEffect, useRef, memo } from "react";
import { SpectrumPayload } from "@/hooks/useAudioData";
import { motion } from "framer-motion";
import { ThemeConfig } from "@/lib/themes";
import { cn } from "@/lib/utils";

interface Props {
  fastDataRef: React.RefObject<SpectrumPayload | null>;
  className?: string;
  theme: ThemeConfig;
}

export const SpectrumVisualizer = memo(({ fastDataRef, className, theme }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use alpha: false for performance optimization as we don't need transparency
    const ctx = canvas.getContext("2d", { alpha: false }); 
    if (!ctx) return;

    let animationFrameId: number;
    
    // Smoothing for the canvas bars
    let smoothedMagnitudes: number[] = [];

    const render = () => {
      // Resize handling
      const parent = canvas.parentElement;
      if (parent) {
        if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
        }
      }

      const { width, height } = canvas;
      
      // Clear with explicit fill for performance
      ctx.clearRect(0, 0, width, height);

      const data = fastDataRef.current;
      if (!data || !data.magnitudes || data.magnitudes.length === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const magnitudes = data.magnitudes;
      
      // Initialize or resize smoothed array
      if (smoothedMagnitudes.length !== magnitudes.length) {
        smoothedMagnitudes = new Array(magnitudes.length).fill(0);
      }

      // Gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, theme.colors.gradientStart); 
      gradient.addColorStop(0.5, theme.colors.gradientMiddle);
      gradient.addColorStop(1, theme.colors.gradientEnd);

      // No fillStyle here, we set it inside loop or use it globally

      // Smoothing factor: 0.1 means slow, 0.5 means fast
      // Snappier response as requested
      const smoothingFactor = 0.5;

      const barWidth = width / magnitudes.length;
      
      // Make blocks thinner for a "lighter" feel
      const blockHeight = 2;
      const gap = 2;
      
      ctx.fillStyle = gradient;

      for (let i = 0; i < magnitudes.length; i++) {
        let rawMag = magnitudes[i];
        
        // Smooth towards target
        smoothedMagnitudes[i] += (rawMag - smoothedMagnitudes[i]) * smoothingFactor;
        
        // Ensure we don't draw negative height
        const magHeight = Math.max(0, Math.min(smoothedMagnitudes[i] * height, height));
        
        const x = i * barWidth;
        
        // Optimize: Don't draw if too small
        if (magHeight < 1) continue;

        const totalBlocks = Math.floor(magHeight / (blockHeight + gap));

        ctx.beginPath();
        for (let j = 0; j < totalBlocks; j++) {
            const blockY = height - (j + 1) * (blockHeight + gap);
            
            // Lighter look: slightly narrower bars relative to slot
            const actualBarWidth = Math.max(barWidth - 2, 1);
            
            // Optimization: rect is faster than roundRect
            ctx.rect(x, blockY, actualBarWidth, blockHeight);
        }
        ctx.fill();
      }

      // Draw cutoff line if valid
      if (data.cutoff_freq > 0) {
          const maxFreq = 24000;
          const cutoffX = (data.cutoff_freq / maxFreq) * width;
          
          ctx.strokeStyle = theme.colors.gridLine;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(cutoffX, 0);
          ctx.lineTo(cutoffX, height);
          ctx.stroke();

          // Reset dash
          ctx.setLineDash([]);

          // Label
          ctx.fillStyle = theme.colors.gridLabel;
          ctx.font = "10px monospace";
          ctx.fillText(`${(data.cutoff_freq / 1000).toFixed(1)}kHz`, cutoffX + 4, 20);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]); // Re-run effect only when theme changes (fastDataRef is stable)

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "relative w-full h-full p-6 md:p-8 transition-colors duration-500",
        className
      )}
    >
      <div className="absolute top-6 left-6 z-10 md:top-8 md:left-8">
        <h3 className={cn("text-xs font-semibold tracking-widest uppercase opacity-70", theme.colors.textSecondary)}>Real-time Spectrum</h3>
      </div>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
    </motion.div>
  );
});
