"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalcResult, Mode, QualifiedReason, SchemeResult } from "@/lib/start/startCalc";
import { BOOKING_URL, BookBar, BookingPopup, CARD, CTA, CountUpMoney, money } from "./parts";

function Bar({ scheme, mode }: { scheme: SchemeResult; mode: Mode }) {
  const total = scheme.maxPrice || 1;
  const seg = [
    { label: "Your deposit", v: scheme.depositRequired, cls: "bg-[#00A3E0]" },
    ...(mode === "htb" ? [{ label: "Government share", v: scheme.govShare, cls: "bg-[#2E9E6B]" }] : []),
    { label: "Home loan", v: scheme.loan, cls: "bg-[#0B4A7A]" },
  ];
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-[#DCEBF8]">
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
            <span className="text-[15px] text-[#4E6C8B]">{s.label}</span>
            <span className="font-display ml-auto text-[19px] tracking-wide text-[#0B2C4A]">{money(s.v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Point 4: sections are named after the scheme, not the deposit percentage.
   Help to Buy stays the default/hero. */
const SCHEMES: { m: Mode; label: string; short: string; subtitle: string }[] = [
  {
    m: "htb",
    label: "Help to Buy — Government Shared Equity",
    short: "Help to Buy",
    subtitle: "2% deposit, the government co-owns up to 40% new / 30% existing",
  },
  {
    m: "fhg",
    label: "First Home Guarantee",
    short: "First Home Guarantee",
    subtitle: "5% deposit, no lenders mortgage insurance",
  },
];

/* Point 6: shown INSTEAD of the book-a-call push when a lead doesn't clear the
   qualification rules. The results themselves are identical — this replaces
   the CTA, and never tells anyone they "don't qualify". The lead reason picks
   which tip leads; all three are always shown. */
function HowToGetThere({
  reason,
  depositShortfall,
}: {
  reason: QualifiedReason;
  depositShortfall: number;
}) {
  const tips = [
    {
      key: "deposit_short_of_costs" as const,
      title: "Build the deposit a little further",
      body:
        depositShortfall > 0
          ? `You're around ${money(depositShortfall)} short of the deposit Help to Buy needs to put a $500,000 purchase in reach. That gap is often closer than it looks once grants and stamp duty concessions are counted.`
          : "A slightly larger deposit lifts your purchase price, and covers stamp duty and the usual conveyancing and inspection costs more comfortably.",
    },
    {
      key: "capacity_below_500k" as const,
      title: "Reduce your existing debts",
      body: "Closing or lowering a credit card limit is the quickest lever — lenders assess the limit, not the balance. Paying out a car or personal loan frees up the monthly repayment as well.",
    },
    {
      key: "htb_max_below_500k" as const,
      title: "Consider a different area",
      body: "Scheme price caps and property values both change by suburb. A nearby area, or a regional centre, can put a purchase within reach on the same numbers.",
    },
  ];
  const ordered = [...tips].sort((a, b) => (a.key === reason ? -1 : b.key === reason ? 1 : 0));

  return (
    <div className={`mt-6 ${CARD} p-6`}>
      <p className="text-[12px] uppercase tracking-[0.2em] text-[#0076BE]">Here&apos;s how to get there</p>
      <h2 className="font-display mt-2 text-[26px] leading-[1.1] tracking-wide text-[#0B2C4A]">
        A few things that would move this
      </h2>
      <div className="mt-5 space-y-4">
        {ordered.map((t) => (
          <div key={t.key} className="rounded-2xl border border-[#E3EFF9] bg-[#F8FCFF] p-4">
            <p className="text-[15px] font-semibold text-[#0B2C4A]">{t.title}</p>
            <p className="mt-1 text-[14px] leading-snug text-[#4E6C8B]">{t.body}</p>
          </div>
        ))}
      </div>
      <a
        href={BOOKING_URL}
        target="_blank"
        rel="noreferrer"
        className={`mt-6 flex h-14 items-center justify-center rounded-2xl text-[17px] font-bold transition active:scale-[0.98] ${CTA}`}
      >
        Get a free plan →
      </a>
      <p className="mt-3 text-center text-[13px] leading-snug text-[#7C93A9]">
        A short call to map out what would put a purchase within reach, and when.
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#D6E6F5] bg-white p-4">
      <p className="text-[12px] uppercase tracking-[0.14em] text-[#7C93A9]">{label}</p>
      <p className="font-display mt-1 text-[26px] leading-none tracking-wide text-[#0B2C4A]">{value}</p>
      {sub && <p className="mt-1 text-[12px] leading-snug text-[#8AA0B4]">{sub}</p>}
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

  // The 15s book-a-call popup is for qualified leads only. Unqualified leads
  // get the softer "how to get there" section instead — never a popup, and
  // never a "you don't qualify" message.
  useEffect(() => {
    if (dismissed || !calc.qualified) return;
    const t = setTimeout(() => setShowPopup(true), 15000);
    return () => clearTimeout(t);
  }, [dismissed, calc.qualified]);

  const scheme = mode === "htb" ? calc.htb : calc.fhg;
  const other = mode === "htb" ? calc.fhg : calc.htb;
  const active = SCHEMES.find((x) => x.m === mode)!;
  const inactive = SCHEMES.find((x) => x.m !== mode)!;

  return (
    <div className="min-h-screen">
      {calc.qualified && <BookBar position="top" />}

      <div className={`px-5 pt-6 ${calc.qualified ? "pb-36" : "pb-12"}`}>
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
                className="h-16 w-16 rounded-full bg-gradient-to-br from-[#0076BE] to-[#7FD8FF] blur-[2px]"
              />
              <p className="mt-6 text-[16px] text-[#4E6C8B]">Calculating your results…</p>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[13px] uppercase tracking-[0.2em] text-[#0076BE]">
                {firstName ? `${firstName}, here it is` : "Here it is"}
              </p>

              {/* mode toggle */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[#D6E6F5] bg-white p-1.5">
                {SCHEMES.map((t) => (
                  <button
                    key={t.m}
                    onClick={() => onModeChange(t.m)}
                    className={[
                      "relative min-h-[48px] rounded-xl px-3 text-[14px] font-bold transition",
                      mode === t.m ? "text-white" : "text-[#4E6C8B]",
                    ].join(" ")}
                  >
                    {mode === t.m && (
                      <motion.span
                        layoutId="start-mode-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0076BE] to-[#00A3E0]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative">{t.short}</span>
                  </button>
                ))}
              </div>

              {/* hero */}
              <div className="mt-6 rounded-3xl border border-[#C7E0F5] bg-gradient-to-b from-white to-[#EAF5FE] p-6 text-center shadow-[0_10px_30px_-18px_rgba(11,44,74,0.4)]">
                <p className="text-[15px] font-semibold leading-snug text-[#0B2C4A]">{active.label}</p>
                <p className="mt-1 text-[13px] leading-snug text-[#6B87A3]">{active.subtitle}</p>

                <p className="mt-5 text-[14px] text-[#4E6C8B]">
                  You could buy up to{locationLabel ? ` in ${locationLabel}` : ""}
                </p>
                <p className="font-display mt-1 bg-gradient-to-r from-[#0076BE] to-[#00B4E8] bg-clip-text text-[56px] leading-none tracking-wide text-transparent">
                  <CountUpMoney value={scheme?.maxPrice ?? 0} />
                </p>
                <p className="mt-2 text-[14px] text-[#4E6C8B]">
                  using your full {money(scheme?.depositRequired ?? 0)} deposit
                </p>

                {/* Point 2: the minimum they could get in with at this price. */}
                {scheme && scheme.minDeposit > 0 && (
                  <p className="mt-4 rounded-xl bg-[#E2F1FD] px-3 py-2.5 text-[14px] leading-snug text-[#0B2C4A]">
                    You could get in with as little as{" "}
                    <span className="font-semibold">{money(scheme.minDeposit)}</span>
                    <span className="text-[#4E6C8B]">
                      {" "}
                      — the {mode === "htb" ? "2%" : "5%"} scheme minimum at this price.
                    </span>
                  </p>
                )}

                {scheme?.cappedByArea && (
                  <p className="mt-3 rounded-xl bg-[#EAF5FE] px-3 py-2 text-[13px] leading-snug text-[#3C5F80]">
                    At this point you&apos;re limited by the {money(scheme.priceCap)} scheme price cap for this area,
                    rather than by what you can borrow.
                  </p>
                )}
              </div>

              {/* split */}
              {scheme && (
                <div className={`mt-5 ${CARD} p-5`}>
                  <p className="text-[12px] uppercase tracking-[0.16em] text-[#7C93A9]">How this is made up</p>
                  <div className="mt-4">
                    <Bar scheme={scheme} mode={mode} />
                  </div>
                </div>
              )}

              {/* stats */}
              {scheme && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Stat label="Monthly repayment" value={money(scheme.monthlyRepayment)} sub="Estimate over 30 years" />
                  <Stat label="Deposit you'd put in" value={money(scheme.depositRequired)} sub="Your full savings" />
                  <Stat
                    label="Scheme minimum"
                    value={money(scheme.minDeposit)}
                    sub={`${mode === "htb" ? "2" : "5"}% of the purchase price`}
                  />
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
                  className="mt-4 w-full rounded-2xl border border-[#D6E6F5] bg-white p-4 text-left transition active:bg-[#F1F8FE]"
                >
                  <p className="text-[14px] leading-snug text-[#4E6C8B]">
                    Under <span className="font-semibold text-[#0B2C4A]">{inactive.short}</span> you&apos;d be at{" "}
                    <span className="font-semibold text-[#0B2C4A]">{money(other.maxPrice)}</span>, repaying{" "}
                    <span className="font-semibold text-[#0B2C4A]">{money(other.monthlyRepayment)}</span> a month, and
                    could get in with as little as{" "}
                    <span className="font-semibold text-[#0B2C4A]">{money(other.minDeposit)}</span>.
                  </p>
                  <p className="mt-1.5 text-[13px] font-semibold text-[#0076BE]">Tap to compare →</p>
                </button>
              )}

              {/* soft note — never a block */}
              {calc.incomeOverCap && (
                <p className="mt-4 rounded-2xl border border-[#D6E6F5] bg-white p-4 text-[14px] leading-snug text-[#4E6C8B]">
                  Please note: your income is above the usual Help to Buy guideline of {money(calc.incomeCap)}. The figures
                  above still stand. We&apos;ll confirm this on a call and show you the best path either way.
                </p>
              )}

              {!calc.qualified && (
                <HowToGetThere
                  reason={calc.qualifiedReason}
                  depositShortfall={calc.qualifyDepositShortfall}
                />
              )}

              <p className="mt-5 text-[13px] leading-snug text-[#8AA0B4]">
                These are estimates based on the information you provided. Final figures depend on a full lender
                assessment and your eligibility for each scheme.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {calc.qualified && <BookBar position="bottom" />}
      <BookingPopup show={showPopup} onClose={() => { setShowPopup(false); setDismissed(true); }} />
    </div>
  );
}
