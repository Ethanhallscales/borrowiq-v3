"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";

interface Props {
  step: number;
  totalSteps: number;
  onComplete: (count: number) => void;
  onBack: () => void;
}

const OPTIONS: { v: number; label: string; sub: string }[] = [
  { v: 1,  label: "1",  sub: "One property" },
  { v: 2,  label: "2",  sub: "Two properties" },
  { v: 99, label: "3+", sub: "Three or more" },
];

export default function ScreenN2Portfolio({ step, totalSteps, onComplete, onBack }: Props) {
  const [selected, setSelected]   = useState<number | null>(null);
  const [advancing, setAdvancing] = useState(false);

  function handle(v: number) {
    if (advancing) return;
    setSelected(v);
    setAdvancing(true);
    setTimeout(() => onComplete(v), 280);
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
          How many properties do you currently own?
        </motion.h2>

        <div className="flex flex-1 flex-col gap-3">
          {OPTIONS.map((opt, i) => {
            const isSel = selected === opt.v;
            return (
              <motion.button key={opt.v} type="button" onClick={() => handle(opt.v)} disabled={advancing}
                className="relative flex-1 overflow-hidden rounded-2xl text-left outline-none"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                whileTap={{ scale: 0.97 }}>
                <motion.div
                  className="flex h-full items-center gap-4 px-5"
                  animate={{
                    backgroundColor: isSel ? "rgba(0,194,255,0.10)" : "rgba(4,30,58,0.62)",
                    boxShadow: isSel
                      ? "inset 0 0 0 2px #00C2FF, 0 0 32px -8px rgba(0,194,255,0.4)"
                      : "inset 0 0 0 1px rgba(10,61,107,0.7)",
                  }}
                  transition={{ duration: 0.2 }}
                  style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "1rem" }}>
                  <div className="flex-1">
                    <motion.p
                      style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "2rem", letterSpacing: "0.05em" }}
                      animate={{ color: isSel ? "#00C2FF" : "#e6fbff" }}
                      transition={{ duration: 0.2 }}>
                      {opt.label}
                    </motion.p>
                    <motion.p
                      style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem" }}
                      animate={{ color: isSel ? "rgba(127,255,255,0.75)" : "rgba(230,251,255,0.38)" }}
                      transition={{ duration: 0.2 }}>
                      {opt.sub}
                    </motion.p>
                  </div>
                  <motion.span
                    style={{ fontSize: "1.25rem", fontFamily: "var(--font-dm-sans)" }}
                    animate={{ color: isSel ? "#00C2FF" : "rgba(10,61,107,0.9)", x: isSel ? 3 : 0 }}
                    transition={{ duration: 0.2 }}>
                    ›
                  </motion.span>
                </motion.div>
                <AnimatePresence>
                  {isSel && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      initial={{ opacity: 0.8, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.04 }}
                      exit={{ opacity: 0 }}
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
