"use client";

/* Shared UI bits for the /start flow. Nothing here is imported by any
   existing screen — /start owns these outright.
   Light-blue palette, scoped to this route (see page.tsx). */

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

/* Shared class fragments — keeps the palette in one place. */
export const CTA =
  "bg-gradient-to-r from-[#0076BE] to-[#00A3E0] text-white shadow-[0_10px_26px_-10px_rgba(0,118,190,0.75)]";
export const CARD = "rounded-3xl border border-[#D6E6F5] bg-white shadow-[0_2px_10px_-6px_rgba(11,44,74,0.18)]";

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
    <div className="sticky top-0 z-30 bg-[#F6FBFF]/90 px-5 pt-5 pb-3 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[#7C93A9]">
          Step {step + 1} of {total}
        </span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-[#7C93A9]">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#DCEBF8]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#0076BE] to-[#00C2FF]"
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
      <h1 className="font-display text-[34px] leading-[1.05] tracking-wide text-[#0B2C4A]">{title}</h1>
      {sub && <p className="mt-2 text-[15px] leading-snug text-[#4E6C8B]">{sub}</p>}
      <div className="mt-7">{children}</div>
      {footNote && <p className="mt-5 text-[13px] leading-snug text-[#7C93A9]">{footNote}</p>}

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#EAF4FD] via-[#EAF4FD]/95 to-transparent px-5 pb-6 pt-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="h-14 shrink-0 rounded-2xl border border-[#C7DDF0] bg-white px-5 text-[15px] font-semibold text-[#4E6C8B] transition active:scale-[0.97]"
            >
              Back
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className={`h-14 flex-1 rounded-2xl text-[17px] font-bold transition active:scale-[0.97] disabled:opacity-40 disabled:shadow-none ${CTA}`}
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
          ? "border-[#0076BE] bg-[#E2F1FD] shadow-[0_0_0_1px_rgba(0,118,190,0.45)]"
          : "border-[#D6E6F5] bg-white active:bg-[#F1F8FE]",
      ].join(" ")}
    >
      {emoji && <span className="text-2xl leading-none">{emoji}</span>}
      <span className="min-w-0">
        <span className="block text-[16px] font-semibold text-[#0B2C4A]">{label}</span>
        {sub && <span className="block text-[13px] leading-snug text-[#6B87A3]">{sub}</span>}
      </span>
      {selected && <span className="ml-auto text-lg text-[#0076BE]">✓</span>}
    </motion.button>
  );
}

/* ── money input ─────────────────────────────────────────────────────────
   Replaces the old sliders. Typed entry with live thousands separators, a
   $ prefix and a numeric keypad on mobile. Validation is advisory only — a
   soft hint shows under the field but never blocks the Next button, because
   a wrong-looking number is still a lead worth capturing.               */

export type Period = "fortnight" | "month";
/** 26 fortnights a year, 12 months. */
export const toMonthly = (amount: number, period: Period) =>
  period === "fortnight" ? (amount * 26) / 12 : amount;

const digitsOnly = (s: string) => s.replace(/[^\d]/g, "");
const groupThousands = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function MoneyInput({
  value,
  onChange,
  label,
  placeholder,
  hint,
  max,
  maxMessage,
  suffix,
  autoFocus,
  period,
  onPeriodChange,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  placeholder?: string;
  hint?: string;
  /** Advisory ceiling — shows a hint above it, never clamps or blocks. */
  max?: number;
  maxMessage?: string;
  /** e.g. "per month" — rendered inside the field, right-aligned. */
  suffix?: string;
  autoFocus?: boolean;
  /** Renders a fortnightly/monthly switch. The `value` stays whatever unit
      `period` names — the caller converts. Centrelink and child support are
      usually known as a fortnightly figure, so offering the switch stops a
      fortnightly amount being read as a monthly one (a 2.17x overstatement). */
  period?: Period;
  onPeriodChange?: (p: Period) => void;
}) {
  // Held as a string so a half-typed "1,2" doesn't get normalised out from
  // under the cursor, and so the field can be genuinely empty rather than "0".
  const [text, setText] = useState(value ? groupThousands(String(value)) : "");

  // Re-sync only when the parent changes the value to something we didn't type.
  useEffect(() => {
    const current = Number(digitsOnly(text) || 0);
    if (current !== value) setText(value ? groupThousands(String(value)) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handle = (raw: string) => {
    const d = digitsOnly(raw).slice(0, 9);
    setText(groupThousands(d));
    onChange(Number(d || 0));
  };

  const overMax = max !== undefined && value > max;

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center gap-3">
        <label className="flex-1 text-[13px] uppercase tracking-[0.14em] text-[#7C93A9]">{label}</label>
        {period && onPeriodChange && (
          <div className="flex shrink-0 rounded-lg border border-[#D6E6F5] bg-[#F4FAFE] p-0.5">
            {(["fortnight", "month"] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodChange(p)}
                aria-pressed={period === p}
                className={[
                  "rounded-[6px] px-2.5 py-1 text-[12px] font-semibold transition",
                  period === p ? "bg-[#0076BE] text-white" : "text-[#6B87A3]",
                ].join(" ")}
              >
                {p === "fortnight" ? "Fortnightly" : "Monthly"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative mt-2">
        <span className="font-display pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[34px] leading-none text-[#7C93A9]">
          $
        </span>
        <input
          value={text}
          onChange={(e) => handle(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label={label}
          className={[
            "font-display h-14 w-full border-b bg-transparent pl-7 text-[34px] leading-none tracking-wide",
            "text-[#0B2C4A] outline-none transition placeholder:text-[#C2D4E4]",
            suffix ? "pr-24" : "",
            overMax ? "border-[#E0A23C]" : "border-[#D6E6F5] focus:border-[#0076BE]",
          ].join(" ")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[14px] text-[#7C93A9]">
            {suffix}
          </span>
        )}
      </div>
      {overMax && maxMessage && <p className="mt-3 text-[13px] leading-snug text-[#B07419]">{maxMessage}</p>}
      {hint && !overMax && <p className="mt-3 text-[13px] leading-snug text-[#6B87A3]">{hint}</p>}
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
          className="mt-4 text-[14px] font-semibold text-[#0076BE] underline underline-offset-4"
        >
          I know the suburb
        </button>
        {unsureState && (
          <p className="mt-3 text-[13px] text-[#6B87A3]">
            We&apos;ll use {STATE_CAPITAL_CITY[unsureState]} area limits for now. We can adjust this on the call.
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
          className="h-16 w-full rounded-2xl border border-[#D6E6F5] bg-white px-5 text-[17px] text-[#0B2C4A] outline-none placeholder:text-[#9DB2C6] focus:border-[#0076BE]"
        />
        {selected && (
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-lg text-[#0076BE]">✓</span>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 overflow-hidden rounded-2xl border border-[#D6E6F5] bg-white shadow-[0_12px_30px_-16px_rgba(11,44,74,0.35)]"
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
                className="flex w-full items-center justify-between border-b border-[#EAF2FA] px-5 py-4 text-left last:border-0 active:bg-[#F1F8FE]"
              >
                <span className="text-[16px] font-semibold text-[#0B2C4A]">{row[1]}</span>
                <span className="text-[13px] text-[#7C93A9]">
                  {row[2]} {row[0]}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {selected && (
        <p className="mt-3 text-[13px] text-[#6B87A3]">
          {selected.locality}, {STATE_NAMES[selected.capKey] ?? selected.displayState} —{" "}
          {selected.region === "capital_regional" ? "capital / major regional" : "regional"} price limits apply.
        </p>
      )}

      <button
        onClick={() => {
          setUnsure(true);
          onSelect(null);
        }}
        className="mt-4 text-[14px] font-semibold text-[#0076BE] underline underline-offset-4"
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
      ? "sticky top-0 z-40 border-b border-[#D6E6F5]"
      : "fixed bottom-0 left-0 right-0 z-40 border-t border-[#D6E6F5]";
  return (
    <div className={`${base} bg-white/85 px-4 py-3 backdrop-blur-md`}>
      <div className="mx-auto flex max-w-md items-center gap-3">
        <p className="min-w-0 flex-1 text-[13px] leading-tight text-[#4E6C8B]">
          {position === "top" ? "Want your exact numbers?" : "15 minutes, with no obligation."}
        </p>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noreferrer"
          className={`shrink-0 rounded-xl px-4 py-3 text-[14px] font-bold transition active:scale-[0.97] ${CTA}`}
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B2C4A]/35 p-4 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 190, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-[#D6E6F5] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(11,44,74,0.45)]"
          >
            <p className="text-[12px] uppercase tracking-[0.2em] text-[#0076BE]">Free for first home buyers</p>
            <h2 className="font-display mt-2 text-[30px] leading-[1.05] tracking-wide text-[#0B2C4A]">
              Claim your free strategy session
            </h2>
            <p className="mt-3 text-[15px] leading-snug text-[#4E6C8B]">
              A 15-minute call to confirm your exact position: what you can borrow, which grants you can claim, and
              what to do first.
            </p>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className={`mt-5 flex h-14 items-center justify-center rounded-2xl text-[17px] font-bold transition active:scale-[0.98] ${CTA}`}
            >
              Book my free session →
            </a>
            <button onClick={onClose} className="mt-3 w-full py-2 text-[14px] text-[#7C93A9]">
              Not right now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
