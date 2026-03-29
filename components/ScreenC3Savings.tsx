"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import OceanSlider from "@/components/ui/OceanSlider";

interface Props {
  step: number; totalSteps: number;
  currentRate: number;
  onComplete: (savings: number) => void;
  onBack: () => void;
}

export default function ScreenC3Savings({ step, totalSteps, currentRate, onComplete, onBack }: Props) {
  const [savings, setSavings] = useState(20_000);

  const wastedPerYear = Math.round(savings * currentRate);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-4">
        <motion.h2
          className="mb-1 text-center"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        >
          How much in savings or transaction accounts?
        </motion.h2>
        <motion.p
          className="mb-6 text-center text-xs"
          style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        >
          Savings NOT inside your offset account
        </motion.p>

        <OceanSlider
          value={savings}
          min={0}
          max={200_000}
          step={5_000}
          onChange={setSavings}
          onConfirm={() => onComplete(savings)}
          label="Savings outside offset"
          format={v => "$" + v.toLocaleString("en-AU")}
          liveCalc={(v) => {
            const wasted = Math.round(v * currentRate);
            if (v === 0) return null;
            return (
              <motion.div
                className="rounded-xl px-4 py-3 text-center"
                style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.4)" }}
                key={wasted}
                initial={{ scale: 0.97 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(245,158,11,0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Wasted interest per year
                </p>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,8vw,2.2rem)", color: "#FFB800", letterSpacing: "0.03em" }}>
                  ${wasted.toLocaleString("en-AU")}
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(245,158,11,0.65)" }}>
                  You could be saving this by moving it into an offset account
                </p>
              </motion.div>
            );
          }}
          showConfirm
        />
      </div>
    </div>
  );
}
