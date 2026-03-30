"use client";

import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import type { Flow } from "@/lib/types";

const FLOW_LABELS: Record<Flow, { label: string; colour: string }> = {
  A: { label: "First Home Buyer",    colour: "#00C2FF" },
  B: { label: "Next Property",       colour: "#7FFFFF" },
  C: { label: "Loan Review",         colour: "#00C2FF" },
};

interface Props {
  flow:       Flow;
  step:       number;
  totalSteps: number;
  title:      string;
  onBack:     () => void;
}

export default function FlowPlaceholder({ flow, step, totalSteps, title, onBack }: Props) {
  const { label, colour } = FLOW_LABELS[flow];

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />

      <QuizHeader step={step} totalSteps={totalSteps} onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        {/* Flow badge */}
        <motion.div
          className="rounded-full px-4 py-1.5 text-xs uppercase tracking-widest"
          style={{
            background: `${colour}18`,
            border: `1px solid ${colour}40`,
            color: colour,
            fontFamily: "var(--font-dm-sans)",
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          Flow {flow} · {label}
        </motion.div>

        {/* Screen title */}
        <motion.h2
          style={{
            fontFamily: "var(--font-bebas-neue)",
            fontSize: "clamp(1.8rem, 8vw, 2.6rem)",
            color: "#e6fbff",
            letterSpacing: "0.04em",
            lineHeight: 1.15,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          {title}
        </motion.h2>

        {/* Coming soon pill */}
        <motion.p
          className="text-sm"
          style={{ color: "rgba(230,251,255,0.3)", fontFamily: "var(--font-dm-sans)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Screen coming soon — routing confirmed ✓
        </motion.p>

        {/* Step indicator */}
        <motion.div
          className="flex gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
        >
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width:  i === step - 1 ? 20 : 6,
                height: 6,
                background: i === step - 1 ? colour : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
