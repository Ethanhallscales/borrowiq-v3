"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import OceanSlider from "@/components/ui/OceanSlider";

interface Props {
  step: number;
  totalSteps: number;
  totalPropertyValue: number;
  onComplete: (balance: number) => void;
  onBack: () => void;
}

const DEFAULT_BALANCE = 300_000;

export default function ScreenN4LoanBalance({ step, totalSteps, totalPropertyValue, onComplete, onBack }: Props) {
  const [balance, setBalance] = useState(DEFAULT_BALANCE);

  const usableEquity = Math.max(0, totalPropertyValue * 0.8 - balance);
  const showEquity   = totalPropertyValue > 0;

  const equityDisplay = usableEquity > 0
    ? "$" + Math.round(usableEquity).toLocaleString("en-AU")
    : "$0";

  const equityLabel = usableEquity > 0
    ? "Your usable equity (80% LVR)"
    : "No usable equity at this balance";

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-6">
        <motion.h2
          className="mb-6 text-center"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.75rem,8vw,2.5rem)", color: "#e6fbff", letterSpacing: "0.04em" }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        >
          What's your total outstanding loan balance?
        </motion.h2>

        <div className="flex flex-1 flex-col justify-center">
          <OceanSlider
            value={balance}
            min={0}
            max={3_000_000}
            step={10_000}
            onChange={setBalance}
            onConfirm={() => onComplete(balance)}
            label="Total mortgage balance across all properties"
            format={v => "$" + v.toLocaleString("en-AU")}
            confirmLabel="Continue →"
            liveCalc={() =>
              showEquity ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={equityDisplay}
                    initial={{ opacity: 0, scale: 0.9, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="mt-1 flex flex-col items-center gap-1 rounded-2xl py-4 px-4"
                    style={{
                      background: usableEquity > 0
                        ? "rgba(34,197,94,0.08)"
                        : "rgba(239,68,68,0.08)",
                      border: `1px solid ${usableEquity > 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: "0.7rem",
                        color: usableEquity > 0 ? "rgba(134,239,172,0.7)" : "rgba(252,165,165,0.7)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {equityLabel}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-bebas-neue)",
                        fontSize: "clamp(2rem,9vw,3rem)",
                        color: usableEquity > 0 ? "#22c55e" : "#ef4444",
                        textShadow: usableEquity > 0
                          ? "0 0 32px rgba(34,197,94,0.55), 0 0 64px rgba(34,197,94,0.25)"
                          : "0 0 32px rgba(239,68,68,0.4)",
                        letterSpacing: "0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {equityDisplay}
                    </p>
                    {usableEquity > 0 && (
                      <p
                        style={{
                          fontFamily: "var(--font-dm-sans)",
                          fontSize: "0.7rem",
                          color: "rgba(134,239,172,0.55)",
                        }}
                      >
                        Available to access for your next purchase
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
}
