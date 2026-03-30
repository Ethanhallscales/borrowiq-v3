"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";

interface Props {
  messages:      string[];
  blurredValue?: string;  // e.g. "$623,000"
  onComplete:    () => void;
  totalMs?:      number;  // default 4000
}

const PARTICLE_COUNT = 28;
const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x:  Math.random() * 100,
  y:  Math.random() * 100,
  size: 2 + Math.random() * 3,
  dur: 3 + Math.random() * 4,
  delay: Math.random() * 3,
}));

export default function ProcessingScreen({ messages, blurredValue, onComplete, totalMs = 4200 }: Props) {
  const [progress,  setProgress]  = useState(0);
  const [msgIndex,  setMsgIndex]  = useState(0);
  const [done,      setDone]      = useState(false);
  const [revealed,  setRevealed]  = useState(false);

  useEffect(() => {
    const interval = 40;
    const steps    = totalMs / interval;
    let step       = 0;

    const timer = setInterval(() => {
      step++;
      const pct = Math.min(step / steps, 1);
      // Ease out cubic
      setProgress(1 - Math.pow(1 - pct, 3));
      setMsgIndex(Math.min(Math.floor(pct * messages.length), messages.length - 1));

      if (pct >= 1) {
        clearInterval(timer);
        setDone(true);
        if (blurredValue) {
          setTimeout(() => setRevealed(true), 400);
          setTimeout(() => onComplete(), 1800);
        } else {
          setTimeout(() => onComplete(), 400);
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [messages.length, onComplete, totalMs]);

  return (
    <div
      className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden"
      style={{ background: "#020B18" }}
    >
      <BlobBackground intensity={0.4} />

      {/* Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top:  `${p.y}%`,
              width:  p.size,
              height: p.size,
              background: "#00C2FF",
            }}
            animate={{
              opacity: [0, 0.7, 0],
              scale:   [0, 1.5, 0],
              y:       [-20, 20],
            }}
            transition={{
              duration: p.dur,
              delay:    p.delay,
              repeat:   Infinity,
              ease:     "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 px-6">
        {/* Logo */}
        <motion.span
          className="tracking-widest"
          style={{
            fontFamily: "var(--font-bebas-neue)",
            fontSize: "1.25rem",
            color: "rgba(230,251,255,0.4)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          BORROWIQ
        </motion.span>

        {/* Progress bar */}
        <div className="w-full">
          <div
            className="relative h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "rgba(10,61,107,0.5)" }}
          >
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ background: "linear-gradient(to right,#0076BE,#00C2FF)" }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <motion.p
            className="mt-3 text-center text-sm"
            style={{ color: "rgba(230,251,255,0.55)", fontFamily: "var(--font-dm-sans)" }}
            key={msgIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {messages[msgIndex]}
          </motion.p>
        </div>

        {/* Blurred preview */}
        <AnimatePresence>
          {done && blurredValue && (
            <motion.div
              className="relative flex flex-col items-center gap-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                className="text-center leading-none"
                style={{
                  fontFamily: "var(--font-bebas-neue)",
                  fontSize: "clamp(2.5rem,12vw,3.5rem)",
                  color: "#00C2FF",
                  letterSpacing: "0.03em",
                  filter: revealed ? "blur(0px)" : "blur(12px)",
                  transition: "filter 0.8s ease",
                  textShadow: "0 0 60px rgba(0,194,255,0.5)",
                }}
              >
                {blurredValue}
              </motion.div>
              {!revealed && (
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="7" width="12" height="8" rx="2" stroke="#00C2FF" strokeWidth="1.4"/>
                    <path d="M5 7V5a3 3 0 016 0v2" stroke="#00C2FF" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span style={{ color: "#00C2FF", fontSize: "0.75rem", fontFamily: "var(--font-dm-sans)" }}>
                    Enter your details to unlock
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
