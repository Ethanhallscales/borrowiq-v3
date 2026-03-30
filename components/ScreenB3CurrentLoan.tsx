"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import OceanSlider from "@/components/ui/OceanSlider";
import NumberPad from "@/components/ui/NumberPad";
import type { LoanType } from "@/lib/types";
import { AnimatePresence } from "framer-motion";

interface Props {
  step: number; totalSteps: number;
  onComplete: (rate: number, type: LoanType, repayment: number) => void;
  onBack: () => void;
}

const LOAN_TYPES: { id: LoanType; label: string; sub: string }[] = [
  { id: "variable", label: "Variable", sub: "Rate moves with market" },
  { id: "fixed",    label: "Fixed",    sub: "Locked in for a term" },
  { id: "split",    label: "Split",    sub: "Part variable, part fixed" },
];

type Phase = "rate" | "type" | "repayment";

export default function ScreenB3CurrentLoan({ step, totalSteps, onComplete, onBack }: Props) {
  const [phase,     setPhase]    = useState<Phase>("rate");
  const [rate,      setRate]     = useState(0.065);
  const [loanType,  setLoanType] = useState<LoanType>("variable");
  const [repayment, setRepayment] = useState(0);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps}
        onBack={phase === "rate" ? onBack : phase === "type" ? () => setPhase("rate") : () => setPhase("type")} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-4">
        <AnimatePresence mode="wait">
          {phase === "rate" && (
            <motion.div key="rate" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-6 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                What's your current interest rate?
              </h2>
              <OceanSlider
                value={rate} min={0.02} max={0.10} step={0.0005}
                onChange={setRate}
                onConfirm={() => setPhase("type")}
                label="Annual interest rate"
                format={v => `${(v * 100).toFixed(2)}%`}
                liveCalc={v => v > 0.062
                  ? <p style={{ color: "#FFB800", fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", textAlign: "center" }}>
                      You're {((v - 0.062) * 100).toFixed(2)}% above market average — potential savings identified
                    </p>
                  : <p style={{ color: "#22c55e", fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", textAlign: "center" }}>
                      Your rate is at or below market average
                    </p>
                }
                confirmLabel="Next →"
                showConfirm
              />
            </motion.div>
          )}

          {phase === "type" && (
            <motion.div key="type" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-8 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                Variable, fixed, or split?
              </h2>
              <div className="flex flex-1 flex-col gap-3">
                {LOAN_TYPES.map((t, i) => (
                  <motion.button key={t.id} type="button"
                    onClick={() => { setLoanType(t.id); setPhase("repayment"); }}
                    className="relative flex-1 overflow-hidden rounded-2xl outline-none"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }} whileTap={{ scale: 0.97 }}>
                    <div className="flex h-full items-center justify-between px-5"
                      style={{ background: "rgba(4,30,58,0.62)", border: "1px solid rgba(10,61,107,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "1rem" }}>
                      <div>
                        <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.5rem", color: "#e6fbff", letterSpacing: "0.05em" }}>{t.label}</p>
                        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", color: "rgba(230,251,255,0.38)" }}>{t.sub}</p>
                      </div>
                      <span style={{ color: "rgba(10,61,107,0.9)", fontSize: "1.25rem", fontFamily: "var(--font-dm-sans)" }}>›</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "repayment" && (
            <motion.div key="repayment" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-1 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                Monthly repayment amount?
              </h2>
              <p className="mb-3 text-center text-xs" style={{ color: "rgba(230,251,255,0.35)", fontFamily: "var(--font-dm-sans)" }}>
                Principal + interest from your bank statement
              </p>
              <NumberPad value={repayment} onChange={setRepayment}
                onConfirm={() => onComplete(rate, loanType, repayment)}
                label="Monthly repayment" suffix="/month" maxDigits={5} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
