"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import type { BuyingSituation } from "@/lib/types";

interface Props {
  step:       number;
  totalSteps: number;
  onComplete: (situation: BuyingSituation) => void;
  onBack:     () => void;
}

const CARDS = [
  {
    id: "solo" as const,
    title: "Solo",
    sub: "Just me on the loan",
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
        <circle cx="22" cy="16" r="7" stroke="#00C2FF" strokeWidth="1.8" fill="none" />
        <path
          d="M8 38c0-7.732 6.268-14 14-14s14 6.268 14 14"
          stroke="#00C2FF"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="22" cy="16" r="3" fill="#7FFFFF" fillOpacity="0.5" />
      </svg>
    ),
  },
  {
    id: "partner" as const,
    title: "With a Partner",
    sub: "Combined income & borrowing power",
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="6" stroke="#00C2FF" strokeWidth="1.8" fill="none" />
        <circle cx="28" cy="16" r="6" stroke="#7FFFFF" strokeWidth="1.8" fill="none" />
        <path
          d="M4 38c0-6.627 5.373-12 12-12"
          stroke="#00C2FF"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M40 38c0-6.627-5.373-12-12-12"
          stroke="#7FFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M16 26c1.8-.6 3.8-.9 6-.9s4.2.3 6 .9"
          stroke="rgba(0,194,255,0.45)"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    ),
  },
] as const;

export default function Screen1BuyingSituation({ step, totalSteps, onComplete, onBack }: Props) {
  const [selected,  setSelected]  = useState<BuyingSituation | null>(null);
  const [advancing, setAdvancing] = useState(false);

  function handleSelect(id: BuyingSituation) {
    if (advancing) return;
    setSelected(id);
    setAdvancing(true);
    setTimeout(() => onComplete(id), 300);
  }

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden"
      style={{ background: "#020B18" }}
    >
      <BlobBackground intensity={0.2} />

      <QuizHeader step={step} totalSteps={totalSteps} onBack={onBack} />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-6">
        {/* Question */}
        <motion.h2
          className="mb-8 text-center leading-tight"
          style={{
            fontFamily: "var(--font-bebas-neue)",
            fontSize: "clamp(1.75rem, 8vw, 2.5rem)",
            color: "#e6fbff",
            letterSpacing: "0.04em",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          Are you buying alone
          <br />
          or with a partner?
        </motion.h2>

        {/* Main cards */}
        <div className="flex flex-1 flex-col gap-3">
          {CARDS.map((card, i) => {
            const isSelected = selected === card.id;
            return (
              <motion.button
                key={card.id}
                type="button"
                onClick={() => handleSelect(card.id)}
                disabled={advancing}
                className="relative flex-1 overflow-hidden rounded-3xl text-center outline-none"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                whileTap={advancing ? {} : { scale: 0.97 }}
              >
                <motion.div
                  className="flex h-full flex-col items-center justify-center gap-4 px-6 py-8"
                  animate={{
                    backgroundColor: isSelected
                      ? "rgba(0,194,255,0.10)"
                      : "rgba(4,30,58,0.62)",
                    boxShadow: isSelected
                      ? "inset 0 0 0 2px #00C2FF, 0 0 48px -8px rgba(0,194,255,0.45)"
                      : "inset 0 0 0 1px rgba(10,61,107,0.70)",
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    backdropFilter: "blur(18px)",
                    WebkitBackdropFilter: "blur(18px)",
                    borderRadius: "1.5rem",
                  }}
                >
                  <motion.div
                    animate={{ scale: isSelected ? 1.12 : 1, y: isSelected ? -2 : 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 20 }}
                  >
                    {card.icon}
                  </motion.div>

                  <div>
                    <motion.p
                      className="leading-none tracking-widest"
                      style={{
                        fontFamily: "var(--font-bebas-neue)",
                        fontSize: "clamp(1.6rem, 7vw, 2rem)",
                      }}
                      animate={{ color: isSelected ? "#00C2FF" : "#e6fbff" }}
                      transition={{ duration: 0.2 }}
                    >
                      {card.title}
                    </motion.p>
                    <motion.p
                      className="mt-1.5 text-sm leading-snug"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                      animate={{
                        color: isSelected
                          ? "rgba(127,255,255,0.80)"
                          : "rgba(230,251,255,0.38)",
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {card.sub}
                    </motion.p>
                  </div>
                </motion.div>

                {/* Expanding ring pulse */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-3xl"
                      initial={{ opacity: 0.8, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.06 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                      style={{ border: "2.5px solid #00C2FF" }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Single parent tertiary link */}
        <motion.div
          className="mt-5 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button
            type="button"
            onClick={() => handleSelect("single-parent")}
            disabled={advancing}
            className="flex items-center gap-1.5 rounded-full px-4 py-2"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            <span style={{ color: "rgba(230,251,255,0.35)", fontSize: "0.875rem" }}>
              Buying as a single parent?
            </span>
            <motion.span
              style={{ color: "#00C2FF", fontSize: "0.875rem" }}
              animate={selected === "single-parent" ? { x: [0, 4, 0] } : { x: 0 }}
            >
              Tap here →
            </motion.span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
