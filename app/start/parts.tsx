"use client";

/* Shared UI bits for the /start flow. Nothing here is imported by any
   existing screen — /start owns these outright. */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { rankLocations } from "@/lib/start/locationSearch";
import {
  SELECTABLE_STATES,
  STATE_NAMES,
  STATE_CAPITAL_CITY,
  rowToLocation,
  type LocationRow,
  type ResolvedLocation,
} from "@/lib/start/locationCaps";

export const BOOKING_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? "#";

export const money = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(
    Math.round(n || 0),
  );

/* ── count-up, for the "numbers moving" feel ─────────────────────────────── */

export function useCountUp(target: number, duration = 750) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

export function CountUpMoney({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(value);
  return <span className={className}>{money(shown)}</span>;
}

/* ── progress ────────────────────────────────────────────────────────────── */

export function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.min(Math.round(((step + 1) / total) * 100), 100);
  return (
    <div className="sticky top-0 z-30 px-5 pt-5 pb-3 bg-ocean-base/85 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] tracking-[0.18em] uppercase text-ocean-highlight/60">
          Step {step + 1} of {total}
        </span>
        <span className="text-[11px] tracking-[0.18em] uppercase text-ocean-highlight/60">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-ocean-primary to-ocean-highlight"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

/* ── step shell ──────────────────────────────────────────────────────────── */

export function StepShell({
  title,
  sub,
  children,
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
  footNote,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  footNote?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="px-5 pb-40 pt-6"
    >
      <h1 className="font-display text-[34px] leading-[1.05] tracking-wide text-white">{title}</h1>
      {sub && <p className="mt-2 text-[15px] leading-snug text-ocean-highlight/70">{sub}</p>}
      <div className="mt-7">{children}</div>
      {footNote && <p className="mt-5 text-[13px] leading-snug text-ocean-highlight/50">{footNote}</p>}

      <div className="fixed bottom-0 left-0 right-0 z-20 px-5 pb-6 pt-4 bg-gradient-to-t from-ocean-base via-ocean-base/95 to-transparent">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="h-14 shrink-0 rounded-2xl border border-white/15 px-5 text-[15px] font-semibold text-ocean-highlight/70 active:scale-[0.97] transition"
            >
              Back
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className="h-14 flex-1 rounded-2xl bg-gradient-to-r from-ocean-primary to-ocean-accent text-[17px] font-bold text-white shadow-[0_10px_30px_-8px_rgba(0,194,255,0.6)] transition active:scale-[0.97] disabled:opacity-30 disabled:shadow-none"
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── chips ───────────────────────────────────────────────────────────────── */

export function Chip({
  label,
  sub,
  emoji,
  selected,
  onClick,
  wide,
}: {
  label: string;
  sub?: string;
  emoji?: string;
  selected: boolean;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={[
        "flex min-h-[64px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
        wide ? "w-full" : "flex-1",
        selected
          ? "border-ocean-accent bg-ocean-accent/15 shadow-[0_0_0_1px_rgba(0,194,255,0.5)]"
          : "border-white/12 bg-white/[0.04] active:bg-white/[0.08]",
      ].join(" ")}
    >
      {emoji && <span className="text-2xl leading-none">{emoji}</span>}
      <span className="min-w-0">
        <span className="block text-[16px] font-semibold text-white">{label}</span>
        {sub && <span className="block text-[13px] leading-snug text-ocean-highlight/60">{sub}</span>}
      </span>
      {selected && <span className="ml-auto text-ocean-accent text-lg">✓</span>}
    </motion.button>
  );
}

/* ── slider ──────────────────────────────────────────────────────────────── */

export function BigSlider({
  value,
  onChange,
  min,
  max,
  step,
  label,
  hint,
  format = money,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  label?: string;
  hint?: string;
  format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      {label && <p className="text-[13px] uppercase tracking-[0.14em] text-ocean-highlight/60">{label}</p>}
      <motion.p
        key={Math.round(value)}
        initial={{ scale: 0.97, opacity: 0.75 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="font-display mt-1 text-[40px] leading-none tracking-wide text-white"
      >
        {format(value)}
      </motion.p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label ?? "amount"}
        className="start-range mt-5 h-2 w-full cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(90deg, var(--ocean-accent) 0%, var(--ocean-highlight) ${pct}%, rgba(255,255,255,0.12) ${pct}%, rgba(255,255,255,0.12) 100%)`,
        }}
      />
      <div className="mt-2 flex justify-between text-[12px] text-ocean-highlight/45">
        <span>{format(min)}</span>
        <span>{format(max)}+</span>
      </div>
      {hint && <p className="mt-3 text-[13px] leading-snug text-ocean-highlight/55">{hint}</p>}
    </div>
  );
}

/* ── location picker ─────────────────────────────────────────────────────── */

export function LocationPicker({
  data,
  selected,
  onSelect,
  unsureState,
  onUnsureState,
}: {
  data: LocationRow[] | null;
  selected: ResolvedLocation | null;
  onSelect: (loc: ResolvedLocation | null) => void;
  unsureState: string;
  onUnsureState: (s: string) => void;
}) {
  const [query, setQuery] = useState(selected ? `${selected.locality} ${selected.postcode}` : "");
  const [open, setOpen] = useState(false);
  const [unsure, setUnsure] = useState(!!unsureState && !selected);

  const results = data && query.trim().length >= 2 && !selected ? rankLocations(data, query) : [];

  if (unsure) {
    return (
      <div>
        <div className="grid grid-cols-2 gap-3">
          {SELECTABLE_STATES.map((s) => (
            <Chip
              key={s}
              label={s}
              sub={STATE_CAPITAL_CITY[s]}
              selected={unsureState === s}
              onClick={() => {
                onSelect(null);
                onUnsureState(s);
              }}
            />
          ))}
        </div>
        <button
          onClick={() => {
            setUnsure(false);
            onUnsureState("");
          }}
          className="mt-4 text-[14px] font-semibold text-ocean-accent underline underline-offset-4"
        >
          Actually, I know the suburb
        </button>
        {unsureState && (
          <p className="mt-3 text-[13px] text-ocean-highlight/55">
            We&apos;ll use {STATE_CAPITAL_CITY[unsureState]} area limits for now — easy to change on the call.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          inputMode="text"
          autoComplete="off"
          placeholder="Suburb or postcode"
          className="h-16 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 text-[17px] text-white placeholder:text-ocean-highlight/35 outline-none focus:border-ocean-accent"
        />
        {selected && (
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-ocean-accent text-lg">✓</span>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 overflow-hidden rounded-2xl border border-white/12 bg-ocean-surface"
          >
            {results.map((row, idx) => (
              <button
                key={`${row[0]}-${row[1]}-${idx}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const loc = rowToLocation(row);
                  onSelect(loc);
                  onUnsureState("");
                  setQuery(`${loc.locality} ${loc.postcode}`);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between border-b border-white/8 px-5 py-4 text-left last:border-0 active:bg-white/10"
              >
                <span className="text-[16px] font-semibold text-white">{row[1]}</span>
                <span className="text-[13px] text-ocean-highlight/55">
                  {row[2]} {row[0]}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {selected && (
        <p className="mt-3 text-[13px] text-ocean-highlight/60">
          {selected.locality}, {STATE_NAMES[selected.capKey] ?? selected.displayState} —{" "}
          {selected.region === "capital_regional" ? "capital / major regional" : "regional"} price limits apply.
        </p>
      )}

      <button
        onClick={() => {
          setUnsure(true);
          onSelect(null);
        }}
        className="mt-4 text-[14px] font-semibold text-ocean-accent underline underline-offset-4"
      >
        Not sure where yet?
      </button>
    </div>
  );
}

/* ── booking CTAs ────────────────────────────────────────────────────────── */

export function BookBar({ position }: { position: "top" | "bottom" }) {
  const base =
    position === "top"
      ? "sticky top-0 z-40 border-b border-white/10"
      : "fixed bottom-0 left-0 right-0 z-40 border-t border-white/10";
  return (
    <div className={`${base} glass px-4 py-3`}>
      <div className="mx-auto flex max-w-md items-center gap-3">
        <p className="min-w-0 flex-1 text-[13px] leading-tight text-ocean-highlight/80">
          {position === "top" ? "Want your exact number?" : "15 minutes. No obligation."}
        </p>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-xl bg-gradient-to-r from-ocean-primary to-ocean-accent px-4 py-3 text-[14px] font-bold text-white active:scale-[0.97] transition"
        >
          Book a free call →
        </a>
      </div>
    </div>
  );
}

export function BookingPopup({ show, onClose }: { show: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 190, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-white/12 bg-ocean-surface p-6 shadow-2xl"
          >
            <p className="text-[12px] uppercase tracking-[0.2em] text-ocean-accent">Free for first home buyers</p>
            <h2 className="font-display mt-2 text-[30px] leading-[1.05] tracking-wide text-white">
              Claim your free strategy session
            </h2>
            <p className="mt-3 text-[15px] leading-snug text-ocean-highlight/75">
              A 15-minute call to know your exact position — what you can actually borrow, which grants you can claim,
              and what to do first.
            </p>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="mt-5 flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-ocean-primary to-ocean-accent text-[17px] font-bold text-white active:scale-[0.98] transition"
            >
              Grab my free session →
            </a>
            <button onClick={onClose} className="mt-3 w-full py-2 text-[14px] text-ocean-highlight/50">
              Not right now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
