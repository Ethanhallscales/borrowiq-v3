"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import NumberPad from "@/components/ui/NumberPad";

interface Props {
  step: number;
  totalSteps: number;
  onComplete: (hasRental: boolean, monthlyAmount: number) => void;
  onBack: () => void;
}

type Phase = "choice" | "amount";

export default function ScreenN5RentalIncome({ step, totalSteps, onComplete, onBack }: Props) {
  const [phase,     setPhase]     = useState<Phase>("choice");
  const [selected,  setSelected]  = useState<"yes" | "no" | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [amount,    setAmount]    = useState(0);

  function handleChoice(id: "yes" | "no") {
    if (advancing) return;
    setSelected(id);
    setAdvancing(true);
    if (id === "no") {
      setTimeout(() => onComplete(false, 0), 280);
    } else {
      setTimeout(() => {
        setAdvancing(false);
        setPhase("amount");
      }, 280);
    }
  }

  function handleConfirmAmount() {
    onComplete(true, amount);
  }

  const OPTIONS: { id: "yes" | "no"; label: string; sub: string; icon: string }[] = [
    { id: "yes", label: "Yes", sub: "I earn rental income", icon: "✓" },
    { id: "no",  label: "No",  sub: "No rental income",     icon: "✗" },
  ];

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={phase === "amount" ? () => setPhase("choice") : onBack} />

      <AnimatePresence mode="wait">
        {phase === "choice" && (
          <motion.div
            key="choice"
            className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-6"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <motion.h2
              className="mb-8 text-center"
              style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.75rem,8vw,2.5rem)", color: "#e6fbff", letterSpacing: "0.04em" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
            >
              Do you receive any rental income?
            </motion.h2>

            <div className="flex flex-1 flex-col gap-3">
              {OPTIONS.map((opt, i) => {
                const isSel = selected === opt.id;
                return (
                  <motion.button
                    key={opt.id} type="button" onClick={() => handleChoice(opt.id)} disabled={advancing}
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
          </motion.div>
        )}

        {phase === "amount" && (
          <motion.div
            key="amount"
            className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-4"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <NumberPad
              value={amount}
              onChange={setAmount}
              onConfirm={handleConfirmAmount}
              label="Total monthly rental income across all properties"
              suffix="/month"
              maxDigits={6}
              confirmLabel="Continue →"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
