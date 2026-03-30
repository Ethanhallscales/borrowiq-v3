"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import NumberPad from "@/components/ui/NumberPad";

interface Props {
  step: number; totalSteps: number;
  loanBalance: number;
  onComplete: (value: number) => void;
  onBack: () => void;
}

export default function ScreenC4PropertyValue({ step, totalSteps, loanBalance, onComplete, onBack }: Props) {
  const [value, setValue] = useState(0);

  const equity    = Math.max(0, value - loanBalance);
  const usable    = Math.max(0, value * 0.8 - loanBalance);
  const lvr       = value > 0 ? ((loanBalance / value) * 100).toFixed(1) : "—";

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
          What is your property worth today?
        </motion.h2>
        <p className="mb-4 text-center text-xs" style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)" }}>
          Rough estimate is fine — check recent sales in your street
        </p>

        {value > loanBalance && (
          <motion.div className="mb-3 grid grid-cols-3 gap-2"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            {[
              { l: "LVR",    v: `${lvr}%`,                          c: parseFloat(lvr) > 80 ? "#ef4444" : "#22c55e" },
              { l: "Equity", v: `$${(equity/1000).toFixed(0)}k`,    c: "#7FFFFF" },
              { l: "Usable", v: `$${(usable/1000).toFixed(0)}k`,    c: "#00C2FF" },
            ].map(s => (
              <div key={s.l} className="rounded-xl px-2 py-2 text-center"
                style={{ background: "rgba(4,30,58,0.65)", border: "1px solid rgba(10,61,107,0.6)" }}>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: s.c }}>{s.v}</p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.6rem", color: "rgba(230,251,255,0.35)", textTransform: "uppercase" }}>{s.l}</p>
              </div>
            ))}
          </motion.div>
        )}

        <NumberPad value={value} onChange={setValue} onConfirm={() => onComplete(value)}
          label="Estimated property value today" maxDigits={7} />
      </div>
    </div>
  );
}
