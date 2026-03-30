"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  value:       number;
  onChange:    (n: number) => void;
  onConfirm:   () => void;
  label:       string;
  sublabel?:   string;
  prefix?:     string;   // default "$"
  suffix?:     string;
  maxDigits?:  number;   // default 7
  canConfirm?: boolean;  // if false, disables confirm btn
  confirmLabel?: string;
}

const KEYS = ["1","2","3","4","5","6","7","8","9","00","0","⌫"] as const;

function fmt(n: number, prefix: string, suffix = ""): string {
  if (n === 0) return `${prefix}0${suffix}`;
  return `${prefix}${n.toLocaleString("en-AU")}${suffix}`;
}

export default function NumberPad({
  value, onChange, onConfirm, label, sublabel,
  prefix = "$", suffix = "", maxDigits = 7,
  canConfirm, confirmLabel = "Continue →",
}: Props) {
  const digits = value === 0 ? "" : String(value);
  const showConfirm = canConfirm ?? value > 0;

  function handleKey(k: string) {
    if (k === "⌫") {
      const next = digits.slice(0, -1);
      onChange(next === "" ? 0 : parseInt(next, 10));
    } else if (k === "00") {
      if (digits.length + 2 > maxDigits) return;
      const next = digits + "00";
      onChange(parseInt(next, 10));
    } else {
      if (digits.length >= maxDigits) return;
      const next = digits + k;
      onChange(parseInt(next, 10));
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Label */}
      <p
        className="mb-1 text-center text-sm leading-snug"
        style={{ color: "rgba(230,251,255,0.5)", fontFamily: "var(--font-dm-sans)" }}
      >
        {label}
      </p>
      {sublabel && (
        <p
          className="mb-3 text-center text-xs leading-relaxed"
          style={{ color: "rgba(230,251,255,0.3)", fontFamily: "var(--font-dm-sans)" }}
        >
          {sublabel}
        </p>
      )}

      {/* Value display */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          className="mb-6 text-center leading-none"
          style={{
            fontFamily: "var(--font-bebas-neue)",
            fontSize: "clamp(2.4rem, 12vw, 3.5rem)",
            color: value > 0 ? "#00C2FF" : "rgba(230,251,255,0.2)",
            textShadow: value > 0 ? "0 0 40px rgba(0,194,255,0.4)" : "none",
            letterSpacing: "0.03em",
          }}
          initial={{ scale: 0.95, opacity: 0.6 }}
          animate={{ scale: 1,    opacity: 1   }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {value > 0 ? fmt(value, prefix, suffix) : `${prefix}—`}
        </motion.div>
      </AnimatePresence>

      {/* Keypad */}
      <div className="mt-auto grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <motion.button
            key={k}
            type="button"
            onClick={() => handleKey(k)}
            className="flex items-center justify-center rounded-2xl py-4 text-xl"
            style={{
              background: k === "⌫" ? "rgba(10,61,107,0.5)" : "rgba(4,30,58,0.7)",
              border: "1px solid rgba(10,61,107,0.6)",
              color: k === "⌫" ? "#00C2FF" : "#e6fbff",
              fontFamily: k === "⌫" ? "var(--font-dm-sans)" : "var(--font-bebas-neue)",
              fontSize: k === "⌫" ? "1.25rem" : "1.5rem",
              letterSpacing: "0.05em",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            whileTap={{ scale: 0.93 }}
          >
            {k}
          </motion.button>
        ))}
      </div>

      {/* Confirm */}
      <AnimatePresence>
        {showConfirm && (
          <motion.button
            type="button"
            onClick={onConfirm}
            className="mt-4 w-full rounded-2xl py-4 text-base font-semibold"
            style={{
              background: "linear-gradient(135deg,#0076BE,#00C2FF)",
              color: "#020B18",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: "0 0 32px -8px rgba(0,194,255,0.6)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            whileTap={{ scale: 0.97 }}
          >
            {confirmLabel}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
