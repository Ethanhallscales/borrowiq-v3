"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import NumberPad from "@/components/ui/NumberPad";
import type { QuizData } from "@/lib/types";

export interface IncomeData {
  annualIncome:          number;
  partnerIncome?:        number;
  investmentProperties?: number;
  monthlyRentalIncome?:  number;
}

interface Props {
  step: number; totalSteps: number;
  quiz: QuizData;
  showInvestmentExtra?: boolean;
  onComplete: (d: IncomeData) => void;
  onBack: () => void;
}

type Phase = "primary" | "partner" | "invest-count" | "invest-rental";

export default function Screen5Income({ step, totalSteps, quiz, showInvestmentExtra, onComplete, onBack }: Props) {
  const [phase,    setPhase]    = useState<Phase>("primary");
  const [primary,  setPrimary]  = useState(0);
  const [partner,  setPartner]  = useState(0);
  const [invCount, setInvCount] = useState(0);
  const [rental,   setRental]   = useState(0);

  const hasPartner = quiz.buyingSituation === "partner";

  function handlePrimary(v: number) {
    if (hasPartner) { setPhase("partner"); return; }
    if (showInvestmentExtra) { setPhase("invest-count"); return; }
    onComplete({ annualIncome: v });
  }

  function handlePartner(v: number) {
    if (showInvestmentExtra) { setPhase("invest-count"); return; }
    onComplete({ annualIncome: primary, partnerIncome: v });
  }

  function handleInvestCount(n: number) {
    setInvCount(n);
    if (n > 0) { setPhase("invest-rental"); return; }
    onComplete({
      annualIncome: primary,
      partnerIncome: hasPartner ? partner : undefined,
      investmentProperties: 0,
      monthlyRentalIncome: 0,
    });
  }

  function handleRental(v: number) {
    onComplete({
      annualIncome: primary,
      partnerIncome: hasPartner ? partner : undefined,
      investmentProperties: invCount,
      monthlyRentalIncome: v,
    });
  }

  function handleBack() {
    if (phase === "primary")      { onBack(); return; }
    if (phase === "partner")      { setPhase("primary"); return; }
    if (phase === "invest-count") { setPhase(hasPartner ? "partner" : "primary"); return; }
    if (phase === "invest-rental"){ setPhase("invest-count"); return; }
  }

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={handleBack} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-4">
        <AnimatePresence mode="wait">

          {phase === "primary" && (
            <motion.div key="primary" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-1 text-center"
                style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                What&apos;s your gross annual income?
              </h2>
              <p className="mb-4 text-center text-xs" style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)" }}>
                Before tax — your total earnings for the year
              </p>
              <NumberPad value={primary} onChange={setPrimary}
                onConfirm={() => handlePrimary(primary)}
                label="Annual income" maxDigits={7} />
            </motion.div>
          )}

          {phase === "partner" && (
            <motion.div key="partner" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-1 text-center"
                style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                What&apos;s your partner&apos;s gross annual income?
              </h2>
              <p className="mb-4 text-center text-xs" style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)" }}>
                Before tax — enter 0 if they&apos;re not contributing
              </p>
              <NumberPad value={partner} onChange={setPartner}
                onConfirm={() => handlePartner(partner)}
                label="Partner's annual income" maxDigits={7} />
            </motion.div>
          )}

          {phase === "invest-count" && (
            <motion.div key="invest-count" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-8 text-center"
                style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                How many investment properties do you own?
              </h2>
              <div className="flex flex-1 flex-col gap-3">
                {([0, 1, 2, 3, 4] as const).map((n, i) => (
                  <motion.button key={n} type="button" onClick={() => handleInvestCount(n)}
                    className="flex-1 overflow-hidden rounded-2xl outline-none"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }} whileTap={{ scale: 0.97 }}>
                    <div className="flex h-full items-center justify-center"
                      style={{ background: "rgba(4,30,58,0.62)", border: "1px solid rgba(10,61,107,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "1rem" }}>
                      <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.8rem", color: "#e6fbff", letterSpacing: "0.05em" }}>
                        {n === 4 ? "4+" : n}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "invest-rental" && (
            <motion.div key="invest-rental" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-1 text-center"
                style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                Total monthly rental income?
              </h2>
              <p className="mb-4 text-center text-xs" style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)" }}>
                Combined across all investment properties
              </p>
              <NumberPad value={rental} onChange={setRental}
                onConfirm={() => handleRental(rental)}
                label="Monthly rental income" maxDigits={6} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
