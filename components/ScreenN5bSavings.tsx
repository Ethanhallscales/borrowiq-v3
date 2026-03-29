"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import OceanSlider from "@/components/ui/OceanSlider";

interface Props {
  step: number;
  totalSteps: number;
  onComplete: (savings: number) => void;
  onBack: () => void;
}

export default function ScreenN5bSavings({ step, totalSteps, onComplete, onBack }: Props) {
  const [value, setValue] = useState(0);

  const confirmLabel = value === 0
    ? "I don't have additional savings →"
    : "Continue →";

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-6">
        <motion.h2
          className="mb-3 text-center"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.75rem,8vw,2.5rem)", color: "#e6fbff", letterSpacing: "0.04em" }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        >
          How much cash do you have available for this purchase?
        </motion.h2>

        <motion.p
          className="mb-8 text-center text-xs leading-relaxed"
          style={{ color: "rgba(230,251,255,0.35)", fontFamily: "var(--font-dm-sans)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        >
          Separate from your property equity — additional cash savings
        </motion.p>

        <div className="flex flex-1 flex-col justify-center">
          <OceanSlider
            value={value}
            min={0}
            max={500_000}
            step={5_000}
            onChange={setValue}
            onConfirm={() => onComplete(value)}
            label="Additional cash savings"
            format={v => "$" + v.toLocaleString("en-AU")}
            confirmLabel={confirmLabel}
          />
        </div>
      </div>
    </div>
  );
}
