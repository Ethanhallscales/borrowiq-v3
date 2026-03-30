"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  value:       number;
  min:         number;
  max:         number;
  step:        number;
  onChange:    (v: number) => void;
  onConfirm?:  () => void;
  label:       string;
  sublabel?:   string;
  format?:     (v: number) => string;
  liveCalc?:   (v: number) => React.ReactNode;
  confirmLabel?: string;
  showConfirm?: boolean;
}

function defaultFmt(v: number): string {
  return "$" + v.toLocaleString("en-AU");
}

export default function OceanSlider({
  value, min, max, step, onChange, onConfirm,
  label, sublabel, format = defaultFmt,
  liveCalc, confirmLabel = "Continue →",
  showConfirm = true,
}: Props) {
  const pct = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value)),
    [onChange],
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* Label */}
      <p
        className="mb-1 text-center text-sm"
        style={{ color: "rgba(230,251,255,0.5)", fontFamily: "var(--font-dm-sans)" }}
      >
        {label}
      </p>
      {sublabel && (
        <p
          className="mb-4 text-center text-xs leading-relaxed"
          style={{ color: "rgba(230,251,255,0.3)", fontFamily: "var(--font-dm-sans)" }}
        >
          {sublabel}
        </p>
      )}

      {/* Large value display */}
      <motion.div
        key={value}
        className="mb-2 text-center leading-none"
        style={{
          fontFamily: "var(--font-bebas-neue)",
          fontSize: "clamp(2.4rem, 12vw, 3.5rem)",
          color: "#00C2FF",
          textShadow: "0 0 40px rgba(0,194,255,0.45)",
          letterSpacing: "0.03em",
        }}
        initial={{ scale: 0.97 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 30 }}
      >
        {format(value)}
      </motion.div>

      {/* Live calc */}
      {liveCalc && (
        <div className="mb-4 text-center">{liveCalc(value)}</div>
      )}

      {/* Track */}
      <div className="relative mx-2 h-12 flex items-center">
        {/* Track bg */}
        <div
          className="absolute inset-x-0 rounded-full"
          style={{ height: 6, background: "rgba(10,61,107,0.55)" }}
        />
        {/* Filled */}
        <div
          className="absolute left-0 rounded-full"
          style={{
            height: 6,
            width: `${pct}%`,
            background: "linear-gradient(to right,#0076BE,#00C2FF)",
          }}
        />
        {/* Thumb glow */}
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-full transition-none"
          style={{
            left: `${pct}%`,
            width: 28,
            height: 28,
            background: "#00C2FF",
            boxShadow: "0 0 16px 4px rgba(0,194,255,0.5)",
            border: "2px solid rgba(255,255,255,0.25)",
          }}
        />
        {/* Hidden native range input layered on top */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          style={{ height: "100%", touchAction: "none" }}
        />
      </div>

      {/* Range labels */}
      <div
        className="mt-2 flex justify-between text-xs"
        style={{ color: "rgba(230,251,255,0.25)", fontFamily: "var(--font-dm-sans)" }}
      >
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>

      {/* Confirm button */}
      <AnimatePresence>
        {showConfirm && onConfirm && (
          <motion.button
            type="button"
            onClick={onConfirm}
            className="mt-6 w-full rounded-2xl py-4 text-base font-semibold"
            style={{
              background: "linear-gradient(135deg,#0076BE,#00C2FF)",
              color: "#020B18",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: "0 0 32px -8px rgba(0,194,255,0.6)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
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
