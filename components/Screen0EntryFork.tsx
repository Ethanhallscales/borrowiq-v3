"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";

const PATHS = [
  {
    id: "first-home",
    title: "I'm buying my first home",
    sub: "Check your borrowing power & government grants",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <path
          d="M4 14L14 4L24 14V24H18V18H10V24H4V14Z"
          stroke="#00C2FF"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="14" cy="13" r="2" fill="#7FFFFF" />
      </svg>
    ),
  },
  {
    id: "next-property",
    title: "I want to buy another property",
    sub: "See your equity, borrowing power & next purchase budget",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <rect x="3" y="13" width="10" height="12" rx="1" stroke="#00C2FF" strokeWidth="1.6" fill="none" />
        <path d="M8 13V7L20 7V23H13" stroke="#00C2FF" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
        <path d="M16 11h3M16 15h3M16 19h3" stroke="#7FFFFF" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "review-loan",
    title: "I want to review my current loan",
    sub: "Find out if you're overpaying & how to save",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <circle cx="14" cy="14" r="9" stroke="#00C2FF" strokeWidth="1.6" fill="none" />
        <path d="M10 14.5l3 3 5-6" stroke="#7FFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

type PathId = (typeof PATHS)[number]["id"];

interface Props {
  onComplete: (path: PathId) => void;
}

export default function Screen0EntryFork({ onComplete }: Props) {
  const [selected, setSelected] = useState<PathId | null>(null);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.45} />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-5 pb-10 pt-safe-top">
        {/* Header */}
        <div className="flex w-full flex-col items-center pt-12 pb-8">
          <motion.p
            className="mb-1 text-xs uppercase tracking-[0.3em]"
            style={{ color: "#00C2FF", fontFamily: "var(--font-dm-sans)" }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Assist Loans
          </motion.p>
          <motion.h1
            className="text-center leading-none tracking-widest"
            style={{
              fontFamily: "var(--font-bebas-neue)",
              fontSize: "clamp(2.6rem, 12vw, 4rem)",
              color: "#e6fbff",
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            BORROWIQ
          </motion.h1>
          <motion.p
            className="mt-3 text-center text-sm leading-relaxed"
            style={{ color: "rgba(230,251,255,0.45)", fontFamily: "var(--font-dm-sans)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            What brings you here today?
          </motion.p>
        </div>

        {/* Cards */}
        <div className="flex w-full max-w-md flex-col gap-3">
          {PATHS.map((path, i) => {
            const isSelected = selected === path.id;
            return (
              <motion.button
                key={path.id}
                type="button"
                onClick={() => setSelected(path.id)}
                className="relative w-full overflow-hidden rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ocean-accent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.4 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div
                  className="flex items-start gap-4 px-5 py-5"
                  animate={{
                    backgroundColor: isSelected ? "rgba(0,194,255,0.09)" : "rgba(4,30,58,0.60)",
                    boxShadow: isSelected
                      ? "inset 0 0 0 1.5px #00C2FF, 0 0 32px -8px rgba(0,194,255,0.4)"
                      : "inset 0 0 0 1px rgba(10,61,107,0.65)",
                  }}
                  transition={{ duration: 0.22 }}
                  style={{
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    borderRadius: "1rem",
                  }}
                >
                  {/* Icon */}
                  <motion.div
                    className="mt-0.5 shrink-0"
                    animate={{ scale: isSelected ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  >
                    {path.icon}
                  </motion.div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <motion.p
                      className="font-display text-xl leading-tight tracking-wide"
                      style={{ fontFamily: "var(--font-bebas-neue)" }}
                      animate={{ color: isSelected ? "#00C2FF" : "#e6fbff" }}
                      transition={{ duration: 0.22 }}
                    >
                      {path.title}
                    </motion.p>
                    <motion.p
                      className="mt-1 text-xs leading-relaxed"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                      animate={{
                        color: isSelected ? "rgba(127,255,255,0.80)" : "rgba(230,251,255,0.38)",
                      }}
                      transition={{ duration: 0.22 }}
                    >
                      {path.sub}
                    </motion.p>
                  </div>

                  {/* Chevron */}
                  <motion.span
                    className="shrink-0 self-center text-xl"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                    animate={{
                      color: isSelected ? "#00C2FF" : "rgba(10,61,107,0.9)",
                      x: isSelected ? 3 : 0,
                    }}
                    transition={{ duration: 0.22 }}
                  >
                    ›
                  </motion.span>
                </motion.div>

                {/* Ring pulse on select */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      initial={{ opacity: 0.7, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.04 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      style={{ border: "2px solid #00C2FF" }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* CTA */}
        <AnimatePresence>
          {selected && (
            <motion.div
              className="mt-6 w-full max-w-md"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                onClick={() => selected && onComplete(selected)}
                className="w-full rounded-2xl py-4 text-base font-semibold tracking-wide transition-transform active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #0076BE, #00C2FF)",
                  color: "#020B18",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 0 32px -8px rgba(0,194,255,0.6)",
                }}
              >
                Get Started →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          className="mt-6 text-center text-xs"
          style={{ color: "rgba(230,251,255,0.2)", fontFamily: "var(--font-dm-sans)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Free · No credit check · 60 seconds
        </motion.p>
      </div>
    </div>
  );
}
