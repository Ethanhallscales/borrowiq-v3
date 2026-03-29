"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import OceanSlider from "@/components/ui/OceanSlider";

interface Props {
  step: number; totalSteps: number;
  onComplete: (deposit: number) => void;
  onBack: () => void;
}

function fmtCurrency(v: number) {
  return "$" + v.toLocaleString("en-AU");
}

export default function Screen6Deposit({ step, totalSteps, onComplete, onBack }: Props) {
  const [deposit, setDeposit] = useState(50_000);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-6">
        <motion.h2
          className="mb-1 text-center"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.75rem,8vw,2.5rem)", color: "#e6fbff", letterSpacing: "0.04em" }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        >
          How much have you saved?
        </motion.h2>
        <motion.p
          className="mb-8 text-center text-sm"
          style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        >
          Include savings, gifts, FHSS withdrawals — all of it
        </motion.p>

        <OceanSlider
          value={deposit}
          min={0}
          max={200_000}
          step={5_000}
          onChange={setDeposit}
          onConfirm={() => onComplete(deposit)}
          label="Total deposit saved"
          format={fmtCurrency}
          liveCalc={(v) => {
            const pct = v > 0 ? (v / (v + 400_000) * 100).toFixed(1) : "0";
            return (
              <p style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem" }}>
                Estimated {pct}% deposit on a $450k property
                {v >= 30_000
                  ? <span style={{ color: "#22c55e" }}> · Qualifies for most schemes ✓</span>
                  : <span style={{ color: "#FFB800" }}> · Aim for $30k+ for best grant access</span>
                }
              </p>
            );
          }}
          showConfirm
        />
      </div>
    </div>
  );
}
