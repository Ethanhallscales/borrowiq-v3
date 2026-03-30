"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import type { EmploymentType } from "@/lib/types";

interface Props {
  step: number; totalSteps: number;
  onComplete: (t: EmploymentType) => void;
  onBack: () => void;
}

const CARDS: { id: EmploymentType; label: string; sub: string }[] = [
  { id: "payg",          label: "PAYG",         sub: "Salary or wages, employer pays tax" },
  { id: "self-employed", label: "Self-Employed", sub: "Sole trader, partnership or company" },
  { id: "contractor",    label: "Contractor",    sub: "ABN-based, contract income" },
  { id: "casual",        label: "Casual",        sub: "Variable hours, no guaranteed income" },
];

export default function Screen4EmploymentType({ step, totalSteps, onComplete, onBack }: Props) {
  const [selected, setSelected]   = useState<EmploymentType | null>(null);
  const [advancing, setAdvancing] = useState(false);

  function handle(id: EmploymentType) {
    if (advancing) return;
    setSelected(id);
    setAdvancing(true);
    setTimeout(() => onComplete(id), 280);
  }

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-6">
        <motion.h2
          className="mb-8 text-center"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.75rem,8vw,2.5rem)", color: "#e6fbff", letterSpacing: "0.04em" }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        >
          How do you earn your income?
        </motion.h2>

        <div className="flex flex-1 flex-col gap-3">
          {CARDS.map((c, i) => {
            const isSelected = selected === c.id;
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => handle(c.id)}
                disabled={advancing}
                className="relative flex-1 overflow-hidden rounded-2xl text-left outline-none"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.07, ease: [0.16,1,0.3,1] }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div
                  className="flex h-full items-center gap-4 px-5"
                  animate={{
                    backgroundColor: isSelected ? "rgba(0,194,255,0.10)" : "rgba(4,30,58,0.62)",
                    boxShadow: isSelected
                      ? "inset 0 0 0 2px #00C2FF, 0 0 32px -8px rgba(0,194,255,0.4)"
                      : "inset 0 0 0 1px rgba(10,61,107,0.7)",
                  }}
                  transition={{ duration: 0.2 }}
                  style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "1rem" }}
                >
                  <div className="flex-1">
                    <motion.p
                      style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.5rem", letterSpacing: "0.05em" }}
                      animate={{ color: isSelected ? "#00C2FF" : "#e6fbff" }}
                      transition={{ duration: 0.2 }}
                    >
                      {c.label}
                    </motion.p>
                    <motion.p
                      style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem" }}
                      animate={{ color: isSelected ? "rgba(127,255,255,0.75)" : "rgba(230,251,255,0.38)" }}
                      transition={{ duration: 0.2 }}
                    >
                      {c.sub}
                    </motion.p>
                  </div>
                  <motion.span
                    style={{ fontSize: "1.25rem", fontFamily: "var(--font-dm-sans)" }}
                    animate={{ color: isSelected ? "#00C2FF" : "rgba(10,61,107,0.9)", x: isSelected ? 3 : 0 }}
                    transition={{ duration: 0.2 }}
                  >›</motion.span>
                </motion.div>
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      initial={{ opacity: 0.8, scale: 1 }} animate={{ opacity: 0, scale: 1.04 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      style={{ border: "2px solid #00C2FF" }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
