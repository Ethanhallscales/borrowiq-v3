"use client";

import { motion } from "framer-motion";

interface QuizHeaderProps {
  step: number;
  totalSteps?: number;
  onBack?: () => void;
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M12.5 5L7.5 10L12.5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function QuizHeader({ step, totalSteps = 8, onBack }: QuizHeaderProps) {
  const progress = step / totalSteps;

  return (
    <div className="relative z-20 shrink-0">
      {/* Progress bar */}
      <div className="h-0.5 w-full" style={{ background: "#041E3A" }}>
        <motion.div
          className="h-full"
          style={{ background: "linear-gradient(to right, #0076BE, #00C2FF)" }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, transparent, rgba(255,255,255,0.35), transparent)",
            }}
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1.2, ease: "easeInOut", delay: 0.4 }}
          />
        </motion.div>
      </div>

      {/* Top bar */}
      <div className="flex h-14 items-center px-4">
        {onBack ? (
          <motion.button
            onClick={onBack}
            className="flex items-center gap-1 rounded-full px-2 py-1.5 text-sm"
            style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)" }}
            whileTap={{ scale: 0.93 }}
          >
            <BackIcon />
            Back
          </motion.button>
        ) : (
          <div className="w-16" />
        )}

        <div className="absolute left-1/2 -translate-x-1/2">
          <span
            className="tracking-widest"
            style={{
              fontFamily: "var(--font-bebas-neue)",
              fontSize: "1.125rem",
              color: "rgba(230,251,255,0.55)",
            }}
          >
            BORROWIQ
          </span>
        </div>

        <div
          className="ml-auto text-xs"
          style={{ color: "rgba(230,251,255,0.22)", fontFamily: "var(--font-dm-sans)" }}
        >
          {step}/{totalSteps}
        </div>
      </div>
    </div>
  );
}
