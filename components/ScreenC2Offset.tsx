"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import OceanSlider from "@/components/ui/OceanSlider";

interface Props {
  step: number; totalSteps: number;
  currentRate: number;
  onComplete: (hasOffset: boolean, balance: number) => void;
  onBack: () => void;
}

type Phase = "choice" | "balance";

export default function ScreenC2Offset({ step, totalSteps, currentRate, onComplete, onBack }: Props) {
  const [phase,   setPhase]   = useState<Phase>("choice");
  const [balance, setBalance] = useState(0);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps}
        onBack={phase === "choice" ? onBack : () => setPhase("choice")} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-4">
        <AnimatePresence mode="wait">

          {phase === "choice" && (
            <motion.div key="choice" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-3 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                Do you have an offset account?
              </h2>
              <p className="mb-8 text-center text-xs" style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)" }}>
                An offset account is linked to your mortgage and reduces the interest you pay
              </p>
              <div className="flex flex-1 flex-col gap-4">
                <motion.button type="button" onClick={() => setPhase("balance")}
                  className="flex-1 overflow-hidden rounded-3xl outline-none"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }} whileTap={{ scale: 0.97 }}>
                  <div className="flex h-full flex-col items-center justify-center gap-3"
                    style={{ background: "rgba(4,30,58,0.62)", border: "1px solid rgba(10,61,107,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "1.5rem" }}>
                    <span style={{ fontSize: "2.5rem" }}>✓</span>
                    <div className="text-center">
                      <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.6rem", color: "#e6fbff", letterSpacing: "0.04em" }}>Yes, I have one</p>
                      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", color: "rgba(230,251,255,0.38)" }}>Tell us what's in it</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button type="button" onClick={() => onComplete(false, 0)}
                  className="flex-1 overflow-hidden rounded-3xl outline-none"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.17 }} whileTap={{ scale: 0.97 }}>
                  <div className="flex h-full flex-col items-center justify-center gap-3"
                    style={{ background: "rgba(4,30,58,0.62)", border: "1px solid rgba(10,61,107,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "1.5rem" }}>
                    <span style={{ fontSize: "2.5rem" }}>✗</span>
                    <div className="text-center">
                      <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.6rem", color: "#e6fbff", letterSpacing: "0.04em" }}>No offset account</p>
                    </div>
                  </div>
                </motion.button>

                {/* No offset info */}
                <motion.div className="rounded-xl px-4 py-3"
                  style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)" }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", color: "rgba(245,158,11,0.85)", lineHeight: 1.5 }}>
                    Most homeowners don't have an offset — and it's costing them thousands. Any savings in a regular account earn less interest than you pay on your mortgage.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {phase === "balance" && (
            <motion.div key="balance" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-6 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                How much is in your offset?
              </h2>
              <OceanSlider value={balance} min={0} max={200_000} step={1_000}
                onChange={setBalance} onConfirm={() => onComplete(true, balance)}
                label="Current offset balance" format={v => "$" + v.toLocaleString("en-AU")}
                liveCalc={v => v > 0
                  ? <p style={{ color: "#22c55e", fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", textAlign: "center" }}>
                      Saving ~${Math.round(v * currentRate).toLocaleString("en-AU")}/yr in interest ✓
                    </p>
                  : null
                }
                showConfirm />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
