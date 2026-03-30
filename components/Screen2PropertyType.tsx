"use client";

import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import type { PropertyType } from "@/lib/types";

interface Props {
  step: number; totalSteps: number;
  onComplete: (t: PropertyType) => void;
  onBack: () => void;
}

const CARDS: { id: PropertyType; label: string; sub: string; icon: string }[] = [
  { id: "house",     label: "House",          sub: "Standalone home + land",      icon: "🏠" },
  { id: "apartment", label: "Unit / Apartment", sub: "Strata title, shared building", icon: "🏢" },
  { id: "townhouse", label: "Townhouse",       sub: "Multi-level, shared walls",   icon: "🏘" },
  { id: "land",      label: "Land + Build",    sub: "Buy land, build new home",    icon: "🔨" },
];

export default function Screen2PropertyType({ step, totalSteps, onComplete, onBack }: Props) {
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
          What type of property?
        </motion.h2>

        <div className="grid flex-1 grid-cols-2 gap-3">
          {CARDS.map((c, i) => (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => onComplete(c.id)}
              className="relative overflow-hidden rounded-3xl text-center outline-none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07, ease: [0.16,1,0.3,1] }}
              whileTap={{ scale: 0.96 }}
            >
              <div
                className="flex h-full flex-col items-center justify-center gap-3 px-3 py-6"
                style={{
                  background: "rgba(4,30,58,0.62)",
                  border: "1px solid rgba(10,61,107,0.7)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderRadius: "1.5rem",
                }}
              >
                <span style={{ fontSize: "2rem" }}>{c.icon}</span>
                <div>
                  <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.35rem", color: "#e6fbff", letterSpacing: "0.05em" }}>{c.label}</p>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.38)", marginTop: 4, lineHeight: 1.4 }}>{c.sub}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
