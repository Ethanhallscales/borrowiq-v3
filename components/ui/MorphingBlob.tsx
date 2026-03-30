"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

const MORPH_KEYFRAMES = [
  "60% 40% 30% 70% / 60% 30% 70% 40%",
  "30% 60% 70% 40% / 50% 60% 30% 60%",
  "50% 60% 30% 60% / 30% 60% 70% 40%",
  "60% 40% 60% 40% / 70% 30% 60% 40%",
  "60% 40% 30% 70% / 60% 30% 70% 40%",
];

const DRIFT_KEYFRAMES = [
  { x: 0,   y: 0,   scale: 1    },
  { x: 30,  y: -20, scale: 1.05 },
  { x: -20, y: 15,  scale: 0.97 },
  { x: 0,   y: 0,   scale: 1    },
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
        style={{ width: 680, height: 680, backgroundColor: "#0076BE" }}
        animate={{
          x:            DRIFT_KEYFRAMES.map((k) => k.x),
          y:            DRIFT_KEYFRAMES.map((k) => k.y),
          scale:        DRIFT_KEYFRAMES.map((k) => k.scale),
          borderRadius: MORPH_KEYFRAMES,
        }}
        transition={{ duration: 18, delay: 0, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ocean-mid — bottom-right */}
      <motion.div
        className="absolute rounded-full blur-3xl -bottom-32 -right-32"
        style={{ width: 580, height: 580, backgroundColor: "#0A3D6B" }}
        animate={{
          x:            DRIFT_KEYFRAMES.map((k) => k.x),
          y:            DRIFT_KEYFRAMES.map((k) => k.y),
          scale:        DRIFT_KEYFRAMES.map((k) => k.scale),
          borderRadius: MORPH_KEYFRAMES,
        }}
        transition={{ duration: 21.6, delay: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ocean-accent — centre */}
      <motion.div
        className="absolute rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 420, height: 420, backgroundColor: "#00C2FF" }}
        animate={{ borderRadius: MORPH_KEYFRAMES }}
        transition={{ duration: 10.8, delay: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
