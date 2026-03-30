"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import NumberPad from "@/components/ui/NumberPad";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  step: number; totalSteps: number;
  onComplete: (propertyValue: number, loanBalance: number) => void;
  onBack: () => void;
}

type Phase = "property-value" | "loan-balance";

function useCountUp(target: number, duration = 1000): number {
  const [v, setV] = useState(target);
  return v;
}

export default function ScreenB2CurrentProperty({ step, totalSteps, onComplete, onBack }: Props) {
  const [phase,          setPhase]   = useState<Phase>("property-value");
  const [propertyValue,  setPropVal] = useState(0);
  const [loanBalance,    setLoanBal] = useState(0);

  const equity       = Math.max(0, propertyValue - loanBalance);
  const usableEquity = Math.max(0, propertyValue * 0.8 - loanBalance);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={phase === "property-value" ? onBack : () => setPhase("property-value")} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-4">
        <AnimatePresence mode="wait">

          {phase === "property-value" && (
            <motion.div key="propval" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-1 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                What is your current property worth?
              </h2>
              <p className="mb-4 text-center text-xs" style={{ color: "rgba(230,251,255,0.35)", fontFamily: "var(--font-dm-sans)" }}>
                Rough estimate is fine — check recent sales in your street
              </p>
              <NumberPad value={propertyValue} onChange={setPropVal}
                onConfirm={() => setPhase("loan-balance")}
                label="Estimated property value" maxDigits={7} />
            </motion.div>
          )}

          {phase === "loan-balance" && (
            <motion.div key="loanbalo" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-1 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                What's your remaining loan balance?
              </h2>
              <p className="mb-2 text-center text-xs" style={{ color: "rgba(230,251,255,0.35)", fontFamily: "var(--font-dm-sans)" }}>
                Check your last mortgage statement or internet banking
              </p>

              {/* Live equity reveal */}
              <AnimatePresence>
                {propertyValue > 0 && loanBalance <= propertyValue && (
                  <motion.div
                    className="mb-3 rounded-2xl px-4 py-3 text-center"
                    style={{ background: "rgba(0,194,255,0.07)", border: "1px solid rgba(0,194,255,0.25)" }}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Your estimated equity
                    </p>
                    <motion.p
                      key={equity}
                      style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.8rem,8vw,2.4rem)", letterSpacing: "0.03em",
                        background: equity > 0 ? "linear-gradient(135deg,#00C2FF,#7FFFFF)" : "none",
                        WebkitBackgroundClip: equity > 0 ? "text" : "unset",
                        WebkitTextFillColor: equity > 0 ? "transparent" : "#e6fbff",
                        textShadow: "none",
                      }}
                      initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      {formatCurrency(equity)}
                    </motion.p>
                    {usableEquity > 0 && (
                      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(127,255,255,0.6)", marginTop: 2 }}>
                        Usable equity (80% LVR): {formatCurrency(usableEquity)}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <NumberPad value={loanBalance} onChange={setLoanBal}
                onConfirm={() => onComplete(propertyValue, loanBalance)}
                label="Current loan balance" maxDigits={7} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
