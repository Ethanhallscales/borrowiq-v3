"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

// Simplified morph keyframes (3 states instead of 5 — fewer interpolation frames)
const MORPH = [
  "60% 40% 30% 70% / 60% 30% 70% 40%",
  "30% 60% 70% 40% / 50% 60% 30% 60%",
  "60% 40% 30% 70% / 60% 30% 70% 40%",
];

// Gentle drift (3 keyframes instead of 4)
const DRIFT = [
  { x: 0,  y: 0,   scale: 1    },
  { x: 20, y: -15, scale: 1.03 },
  { x: 0,  y: 0,   scale: 1    },
];

interface BlobBackgroundProps {
  className?: string;
  intensity?: number;
}

export function BlobBackground({ className, intensity = 0.4 }: BlobBackgroundProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ opacity: intensity }}
      aria-hidden
    >
      {/* ocean-primary — top-left */}
      <motion.div
        className="absolute rounded-full blur-3xl -top-40 -left-40"
        style={{
          width: 680, height: 680, backgroundColor: "#0076BE",
          willChange: "transform, border-radius",
        }}
        animate={{
          x:            DRIFT.map(k => k.x),
          y:            DRIFT.map(k => k.y),
          scale:        DRIFT.map(k => k.scale),
          borderRadius: MORPH,
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ocean-mid — bottom-right */}
      <motion.div
        className="absolute rounded-full blur-3xl -bottom-32 -right-32"
        style={{
          width: 580, height: 580, backgroundColor: "#0A3D6B",
          willChange: "transform, border-radius",
        }}
        animate={{
          x:            DRIFT.map(k => k.x),
          y:            DRIFT.map(k => k.y),
          scale:        DRIFT.map(k => k.scale),
          borderRadius: MORPH,
        }}
        transition={{ duration: 24, delay: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
