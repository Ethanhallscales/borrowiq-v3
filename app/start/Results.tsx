"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalcResult, Mode, SchemeResult } from "@/lib/start/startCalc";
import { BookBar, BookingPopup, CountUpMoney, money } from "./parts";

function Bar({ scheme, mode }: { scheme: SchemeResult; mode: Mode }) {
  const total = scheme.maxPrice || 1;
  const seg = [
    { label: "Your deposit", v: scheme.depositRequired, cls: "bg-ocean-highlight" },
    ...(mode === "htb" ? [{ label: "Government", v: scheme.govShare, cls: "bg-emerald-400" }] : []),
    { label: "Home loan", v: scheme.loan, cls: "bg-ocean-primary" },
  ];
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/10">
        {seg.map((s) => (
          <motion.div
            key={s.label}
            className={s.cls}
            initial={{ width: 0 }}
            animate={{ width: `${(s.v / total) * 100}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {seg.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${s.cls}`} />
            <span className="text-[15px] text-ocean-highlight/75">{s.label}</span>
            <span className="ml-auto font-display text-[19px] tracking-wide text-white">{money(s.v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[12px] uppercase tracking-[0.14em] text-ocean-highlight/55">{label}</p>
      <p className="font-display mt-1 text-[26px] leading-none tracking-wide text-white">{value}</p>
      {sub && <p className="mt-1 text-[12px] leading-snug text-ocean-highlight/50">{sub}</p>}
    </div>
  );
}

export default function Results({
  calc,
  mode,
  onModeChange,
  firstName,
  locationLabel,
}: {
  calc: CalcResult;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  firstName: string;
  locationLabel: string;
}) {
  const [showPopup, setShowPopup] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setShowPopup(true), 15000);
    return () => clearTimeout(t);
  }, [dismissed]);

  const scheme = mode === "htb" ? calc.htb : calc.fhg;
  const other = mode === "htb" ? calc.fhg : calc.htb;

  return (
    <div className="min-h-screen">
      <BookBar position="top" />

      <div className="px-5 pb-36 pt-6">
        {/* ── the reveal ─────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="counting"
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex min-h-[50vh] flex-col items-center justify-center text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                className="h-16 w-16 rounded-full bg-gradient-to-br from-ocean-primary to-ocean-highlight blur-[2px]"
              />
              <p className="mt-6 text-[16px] text-ocean-highlight/70">Crunching your numbers…</p>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[13px] uppercase tracking-[0.2em] text-ocean-accent">
                {firstName ? `${firstName}, here it is` : "Here it is"}
              </p>

              {/* mode toggle */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/12 bg-white/[0.04] p-1.5">
                {(
                  [
                    { m: "htb" as Mode, label: "2% + Help to Buy" },
                    { m: "fhg" as Mode, label: "5% Deposit" },
                  ]
                ).map((t) => (
                  <button
                    key={t.m}
                    onClick={() => onModeChange(t.m)}
                    className={[
                      "relative min-h-[48px] rounded-xl px-3 text-[14px] font-bold transition",
                      mode === t.m ? "text-white" : "text-ocean-highlight/60",
                    ].join(" ")}
                  >
                    {mode === t.m && (
                      <motion.span
                        layoutId="start-mode-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-ocean-primary to-ocean-accent"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* hero */}
              <div className="mt-6 rounded-3xl border border-white/12 bg-gradient-to-b from-white/[0.07] to-transparent p-6 text-center">
                <p className="text-[14px] text-ocean-highlight/70">You could buy up to</p>
                <p className="font-display mt-1 text-[56px] leading-none tracking-wide gradient-text">
                  <CountUpMoney value={scheme?.maxPrice ?? 0} />
                </p>
                <p className="mt-2 text-[14px] text-ocean-highlight/60">
                  {mode === "htb"
                    ? "with a 2% deposit and the government chipping in"
                    : "with a 5% deposit and no LMI"}
                  {locationLabel ? ` in ${locationLabel}` : ""}
                </p>
                {scheme?.cappedByArea && (
                  <p className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-[13px] leading-snug text-ocean-highlight/70">
                    You&apos;re actually capped by the {money(scheme.priceCap)} scheme price limit for this area — not by
                    what you can borrow. Nice problem to have.
                  </p>
                )}
              </div>

              {/* split */}
              {scheme && (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[12px] uppercase tracking-[0.16em] text-ocean-highlight/55">How it&apos;s made up</p>
                  <div className="mt-4">
                    <Bar scheme={scheme} mode={mode} />
                  </div>
                </div>
              )}

              {/* stats */}
              {scheme && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Stat label="Monthly repayment" value={money(scheme.monthlyRepayment)} sub="Estimate over 30 years" />
                  <Stat label="Deposit you need" value={money(scheme.depositRequired)} />
                  {mode === "htb" && scheme.govShare > 0 && (
                    <Stat
                      label="Government share"
                      value={money(scheme.govShare)}
                      sub={`${Math.round(scheme.govPct * 100)}% of the home`}
                    />
                  )}
                  <Stat label="Loan amount" value={money(scheme.loan)} />
                  {scheme.dutySaved > 0 && <Stat label="Stamp duty saved" value={money(scheme.dutySaved)} />}
                  {scheme.grant > 0 && <Stat label="First home grant" value={money(scheme.grant)} />}
                </div>
              )}

              {/* compare */}
              {scheme && other && (
                <button
                  onClick={() => onModeChange(mode === "htb" ? "fhg" : "htb")}
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left active:bg-white/[0.07] transition"
                >
                  <p className="text-[14px] text-ocean-highlight/70">
                    On the {mode === "htb" ? "5% Deposit" : "2% + Help to Buy"} option you&apos;d be at{" "}
                    <span className="font-semibold text-white">{money(other.maxPrice)}</span>, repaying{" "}
                    <span className="font-semibold text-white">{money(other.monthlyRepayment)}</span> a month.
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-ocean-accent">Tap to compare →</p>
                </button>
              )}

              {/* soft note — never a block */}
              {calc.incomeOverCap && (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[14px] leading-snug text-ocean-highlight/70">
                  Heads up: your income is above the usual Help to Buy guideline of {money(calc.incomeCap)}. Your numbers
                  above still stand — we&apos;ll confirm this on a call and show you the best path either way.
                </p>
              )}

              <p className="mt-4 text-[13px] leading-snug text-ocean-highlight/45">
                Estimates only, based on what you told us. Final numbers depend on a lender assessment.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BookBar position="bottom" />
      <BookingPopup show={showPopup} onClose={() => { setShowPopup(false); setDismissed(true); }} />
    </div>
  );
}
