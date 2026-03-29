"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import OceanSlider from "@/components/ui/OceanSlider";
import type { AustralianState, PropertyType, CurrentPropPlan } from "@/lib/types";

interface Props {
  step: number; totalSteps: number;
  onComplete: (price: number, state: AustralianState, propType: PropertyType, plan: CurrentPropPlan) => void;
  onBack: () => void;
}

type Phase = "price" | "state" | "type" | "plan";

const STATES: AustralianState[] = ["QLD","NSW","VIC","WA","SA","TAS","ACT","NT"];
const PROP_TYPES: { id: PropertyType; label: string }[] = [
  { id: "house",     label: "House"           },
  { id: "apartment", label: "Unit/Apartment"  },
  { id: "townhouse", label: "Townhouse"       },
  { id: "land",      label: "Land + Build"    },
];
const PLANS: { id: CurrentPropPlan; label: string; sub: string }[] = [
  { id: "selling",  label: "Selling",                  sub: "Use sale proceeds for next purchase" },
  { id: "keeping",  label: "Keeping as investment",    sub: "Generate rental income, hold the asset" },
  { id: "undecided", label: "Undecided",               sub: "Show me both scenarios" },
];

export default function ScreenB5TargetProperty({ step, totalSteps, onComplete, onBack }: Props) {
  const [phase,    setPhase]    = useState<Phase>("price");
  const [price,    setPrice]    = useState(600_000);
  const [state,    setState]    = useState<AustralianState>("QLD");
  const [propType, setPropType] = useState<PropertyType>("house");
  const [plan,     setPlan]     = useState<CurrentPropPlan | null>(null);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps}
        onBack={phase === "price" ? onBack
          : phase === "state" ? () => setPhase("price")
          : phase === "type"  ? () => setPhase("state")
          : () => setPhase("type")} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-4">
        <AnimatePresence mode="wait">

          {phase === "price" && (
            <motion.div key="price" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-6 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                Target property price?
              </h2>
              <OceanSlider value={price} min={200_000} max={3_000_000} step={25_000}
                onChange={setPrice} onConfirm={() => setPhase("state")}
                label="Target purchase price" format={v => "$" + v.toLocaleString("en-AU")}
                confirmLabel="Next →" showConfirm />
            </motion.div>
          )}

          {phase === "state" && (
            <motion.div key="state" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-6 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                Which state?
              </h2>
              <div className="grid flex-1 grid-cols-4 gap-2 content-start">
                {STATES.map((s, i) => (
                  <motion.button key={s} type="button" onClick={() => { setState(s); setPhase("type"); }}
                    className="overflow-hidden rounded-2xl outline-none"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }} whileTap={{ scale: 0.94 }}>
                    <div className="flex items-center justify-center py-5"
                      style={{ background: "rgba(4,30,58,0.62)", border: "1px solid rgba(10,61,107,0.7)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: "1rem" }}>
                      <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.3rem", color: "#e6fbff", letterSpacing: "0.05em" }}>{s}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "type" && (
            <motion.div key="type" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-6 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                What type of property?
              </h2>
              <div className="grid flex-1 grid-cols-2 gap-3">
                {PROP_TYPES.map((t, i) => (
                  <motion.button key={t.id} type="button" onClick={() => { setPropType(t.id); setPhase("plan"); }}
                    className="overflow-hidden rounded-2xl outline-none"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }} whileTap={{ scale: 0.96 }}>
                    <div className="flex h-full flex-col items-center justify-center py-6 gap-2"
                      style={{ background: "rgba(4,30,58,0.62)", border: "1px solid rgba(10,61,107,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "1rem" }}>
                      <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.3rem", color: "#e6fbff", letterSpacing: "0.05em" }}>{t.label}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "plan" && (
            <motion.div key="plan" className="flex flex-1 flex-col"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}>
              <h2 className="mb-2 text-center" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}>
                Plan for your current property?
              </h2>
              <p className="mb-6 text-center text-xs" style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)" }}>
                This changes your borrowing capacity and results significantly
              </p>
              <div className="flex flex-1 flex-col gap-3">
                {PLANS.map((p, i) => (
                  <motion.button key={p.id} type="button" onClick={() => onComplete(price, state, propType, p.id)}
                    className="relative flex-1 overflow-hidden rounded-2xl text-left outline-none"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }} whileTap={{ scale: 0.97 }}>
                    <div className="flex h-full items-center gap-4 px-5"
                      style={{ background: "rgba(4,30,58,0.62)", border: "1px solid rgba(10,61,107,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "1rem" }}>
                      <div className="flex-1">
                        <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.4rem", color: "#e6fbff", letterSpacing: "0.05em" }}>{p.label}</p>
                        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", color: "rgba(230,251,255,0.38)" }}>{p.sub}</p>
                      </div>
                      <span style={{ color: "rgba(10,61,107,0.9)", fontSize: "1.25rem", fontFamily: "var(--font-dm-sans)" }}>›</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
