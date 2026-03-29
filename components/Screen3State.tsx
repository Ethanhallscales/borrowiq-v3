"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import type { AustralianState } from "@/lib/types";

interface Props {
  step: number; totalSteps: number;
  defaultState?: AustralianState;
  onComplete: (s: AustralianState) => void;
  onBack: () => void;
}

const STATES: { id: AustralianState; label: string }[] = [
  { id: "QLD", label: "QLD" }, { id: "NSW", label: "NSW" },
  { id: "VIC", label: "VIC" }, { id: "WA",  label: "WA"  },
  { id: "SA",  label: "SA"  }, { id: "TAS", label: "TAS" },
  { id: "ACT", label: "ACT" }, { id: "NT",  label: "NT"  },
];

export default function Screen3State({ step, totalSteps, defaultState = "QLD", onComplete, onBack }: Props) {
  const [selected, setSelected] = useState<AustralianState>(defaultState);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-6">
        <motion.h2
          className="mb-2 text-center"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.75rem,8vw,2.5rem)", color: "#e6fbff", letterSpacing: "0.04em" }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        >
          Which state are you buying in?
        </motion.h2>
        <motion.p
          className="mb-6 text-center text-sm"
          style={{ color: "rgba(230,251,255,0.35)", fontFamily: "var(--font-dm-sans)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        >
          Grants and stamp duty vary significantly by state
        </motion.p>

        <div className="grid grid-cols-4 gap-2 content-start">
          {STATES.map((s, i) => {
            const isSelected = selected === s.id;
            return (
              <motion.button
                key={s.id}
                type="button"
                onClick={() => setSelected(s.id)}
                className="relative overflow-hidden rounded-2xl outline-none"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                whileTap={{ scale: 0.94 }}
              >
                <motion.div
                  className="flex flex-col items-center justify-center py-5"
                  animate={{
                    backgroundColor: isSelected ? "rgba(0,194,255,0.12)" : "rgba(4,30,58,0.62)",
                    boxShadow: isSelected
                      ? "inset 0 0 0 2px #00C2FF, 0 0 24px -6px rgba(0,194,255,0.5)"
                      : "inset 0 0 0 1px rgba(10,61,107,0.7)",
                  }}
                  transition={{ duration: 0.18 }}
                  style={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: "1rem" }}
                >
                  <motion.span
                    style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.35rem", letterSpacing: "0.05em" }}
                    animate={{ color: isSelected ? "#00C2FF" : "#e6fbff" }}
                    transition={{ duration: 0.18 }}
                  >
                    {s.label}
                  </motion.span>
                </motion.div>
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      initial={{ opacity: 0.8, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.08 }}
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

        {/* QLD hint */}
        <AnimatePresence>
          {selected === "QLD" && (
            <motion.div
              className="mt-4 rounded-xl px-4 py-3 text-center text-xs"
              style={{
                background: "rgba(0,194,255,0.07)",
                border: "1px solid rgba(0,194,255,0.2)",
                color: "#00C2FF",
                fontFamily: "var(--font-dm-sans)",
              }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              🎉 QLD: No stamp duty for first home buyers under $700k + $30k FHOG for new builds
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue */}
        <motion.button
          type="button"
          onClick={() => onComplete(selected)}
          className="mt-4 w-full rounded-xl py-4 text-base font-semibold"
          style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18", fontFamily: "var(--font-dm-sans)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileTap={{ scale: 0.97 }}
        >
          Continue →
        </motion.button>
      </div>
    </div>
  );
}
