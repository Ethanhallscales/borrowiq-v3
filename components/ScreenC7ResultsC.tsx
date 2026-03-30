"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import type { QuizData } from "@/lib/types";
import { calculatePathC, formatCurrency } from "@/lib/calculations";
import { BEST_AVAILABLE_RATE, BEST_AVAILABLE_RATE_LABEL } from "@/lib/rates";

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? "#";
const STRIPE_URL   = process.env.NEXT_PUBLIC_STRIPE_LINK  ?? "#";

interface Props { quiz: QuizData; }

function useCountUp(target: number, duration = 2200): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const raf = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function StatCard({ label, value, sub, colour = "#00C2FF" }: { label: string; value: string; sub?: string; colour?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl px-3 py-3 text-center"
      style={{ background: "rgba(4,30,58,0.65)", border: "1px solid rgba(10,61,107,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.35rem", color: colour, letterSpacing: "0.03em" }}>{value}</p>
      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.6rem", color: "rgba(230,251,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
      {sub && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.6rem", color: "rgba(230,251,255,0.25)" }}>{sub}</p>}
    </div>
  );
}

export default function ScreenC7ResultsC({ quiz }: Props) {
  const r    = useMemo(() => calculatePathC(quiz), [quiz]);
  const hero = useCountUp(r.annualSavings, 2200);

  const currentRate   = quiz.currentRate ?? 0.065;
  const rateAboveMarket = currentRate > BEST_AVAILABLE_RATE + 0.001;

  // All Path C leads are qualified. Rate above market = primary qualified, at/below = softer.
  const [showBanner, setShowBanner]       = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowBanner(true), 20_000);
    return () => clearTimeout(t);
  }, []);

  const bannerCopy = rateAboveMarket
    ? "You could be saving thousands"
    : "Your rate looks competitive but your loan structure might still have room to improve";

  function share() {
    if (!navigator.share) return;
    navigator.share({ title: "My Refinance Savings", text: `I could save ${formatCurrency(r.annualSavings)}/year by refinancing!`, url: window.location.href });
  }

  return (
    <>
    <div className="relative flex h-dvh w-full flex-col overflow-y-auto overflow-x-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.4} />

      <div className="relative z-10 flex flex-col gap-6 px-5 pb-12 pt-10">

        {/* Hero */}
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.45)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            You could be saving
          </p>
          <div className="mt-2 leading-none"
            style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(2.8rem,14vw,4.5rem)", letterSpacing: "0.02em",
              background: "linear-gradient(135deg,#22c55e,#7FFFFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ${hero.toLocaleString("en-AU")}
          </div>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", color: "rgba(230,251,255,0.3)", marginTop: 6 }}>
            per year — {formatCurrency(r.fiveYearSavings)} over 5 years
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-2 gap-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <StatCard label="Current Annual Interest" value={formatCurrency(r.currentAnnualInterest)} colour="#ef4444" />
          <StatCard label="Optimised Interest"      value={formatCurrency(r.optimisedAnnualInterest)} colour="#22c55e" />
          <StatCard label="Annual Savings"          value={formatCurrency(r.annualSavings)} colour="#7FFFFF" />
          <StatCard label="5-Year Savings"          value={formatCurrency(r.fiveYearSavings)} sub="simple projection" />
          <StatCard label="Current LVR"             value={`${r.currentLvr}%`}
            colour={r.currentLvr > 80 ? "#f59e0b" : "#22c55e"} />
          <StatCard label="Usable Equity"           value={formatCurrency(r.usableEquity)} colour="#00C2FF" />
        </motion.div>

        {/* Offset insight */}
        {r.offsetAnnualSaving > 0 && (
          <motion.div className="rounded-2xl px-4 py-4"
            style={{ background: "rgba(0,194,255,0.07)", border: "1px solid rgba(0,194,255,0.25)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#00C2FF", letterSpacing: "0.05em", marginBottom: 6 }}>
              Offset Account Opportunity
            </p>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.6)", lineHeight: 1.5 }}>
              You have {formatCurrency(quiz.otherSavings ?? 0)} sitting in savings accounts earning less than your mortgage rate of {(currentRate * 100).toFixed(2)}%.
              Moving these funds into an offset account saves {formatCurrency(r.offsetAnnualSaving)} per year in tax-free interest. Unlike savings account interest, offset savings are completely tax-free.
            </p>
          </motion.div>
        )}

        {!quiz.hasOffset && (quiz.otherSavings ?? 0) > 0 && (
          <motion.div className="rounded-2xl px-4 py-4"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#f59e0b", letterSpacing: "0.05em", marginBottom: 6 }}>
              You Don't Have an Offset — But You Should
            </p>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.6)", lineHeight: 1.5 }}>
              With {formatCurrency(quiz.otherSavings ?? 0)} in savings, an offset account linked to your mortgage would save you {formatCurrency(r.offsetAnnualSaving)}/year in tax-free interest. Most lenders offer free offset accounts on variable loans.
            </p>
          </motion.div>
        )}

        {/* Rate comparison */}
        {rateAboveMarket && (
          <motion.div className="rounded-2xl px-4 py-4"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.3)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#ef4444", letterSpacing: "0.05em", marginBottom: 6 }}>
              Rate Comparison
            </p>
            <div className="flex justify-between py-1.5">
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>Your current rate</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#ef4444" }}>{(currentRate * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between py-1.5 border-t" style={{ borderColor: "rgba(10,61,107,0.4)" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>{BEST_AVAILABLE_RATE_LABEL}: {(BEST_AVAILABLE_RATE * 100).toFixed(2)}%</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#22c55e" }}>{(BEST_AVAILABLE_RATE * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between py-1.5 border-t" style={{ borderColor: "rgba(10,61,107,0.4)" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>Annual rate saving</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.2rem", color: "#7FFFFF" }}>{formatCurrency(r.rateAnnualSaving)}/yr</span>
            </div>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", color: "rgba(230,251,255,0.4)", marginTop: 8 }}>
              Switching could save you {formatCurrency(r.rateAnnualSaving)} per year on rate alone
            </p>
          </motion.div>
        )}

        {/* Total savings */}
        <motion.div className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(34,197,94,0.08)", border: "1.5px solid rgba(34,197,94,0.4)" }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#22c55e", letterSpacing: "0.05em", marginBottom: 8 }}>
            Total Savings Potential
          </p>
          {[
            { l: "Offset savings",     v: formatCurrency(r.offsetAnnualSaving),  show: r.offsetAnnualSaving > 0 },
            { l: "Rate savings",       v: formatCurrency(r.rateAnnualSaving),    show: r.rateAnnualSaving > 0 },
            { l: "Annual total",       v: formatCurrency(r.annualSavings),       show: true },
            { l: "Over 5 years",       v: formatCurrency(r.fiveYearSavings),     show: true },
            { l: "Over loan life",     v: formatCurrency(r.loanLifeSavings),     show: true, sub: "simple projection" },
          ].filter(row => row.show).map((row, i) => (
            <div key={row.l} className={`flex justify-between py-1.5 ${i > 0 ? "border-t" : ""}`}
              style={{ borderColor: "rgba(34,197,94,0.15)" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>{row.l}</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#22c55e" }}>{row.v}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Permanent booking CTA (all C leads qualified) ─────────────────── */}
        <motion.div className="rounded-2xl px-5 py-5 text-center"
          style={{ background: "rgba(34,197,94,0.08)", border: "2px solid rgba(34,197,94,0.5)",
            boxShadow: "0 0 36px -12px rgba(34,197,94,0.4)" }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.5rem", color: "#22c55e", letterSpacing: "0.04em" }}>
            Book a Free Call
          </p>
          <p className="mt-1 mb-4" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.5)" }}>
            A free review with our broker can have you saving {formatCurrency(r.annualSavings)} this year.
          </p>
          <a href={CALENDLY_URL} target="_blank" rel="noreferrer" className="block w-full rounded-xl py-3 text-base font-semibold text-center"
            style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18", fontFamily: "var(--font-dm-sans)" }}>
            Book Now →
          </a>
        </motion.div>

        {/* ── Paid product card ─────────────────────────────────────────────── */}
        <motion.div className="rounded-2xl px-5 py-4 text-center"
          style={{ background: "rgba(4,30,58,0.65)", border: "1px solid rgba(10,61,107,0.55)" }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem", color: "rgba(230,251,255,0.65)", lineHeight: 1.5 }}>
            Want to accelerate your journey? Get a custom savings plan PDF and income tracker tool
          </p>
          <a href={STRIPE_URL} target="_blank" rel="noreferrer" className="mt-3 block w-full rounded-xl py-3 text-sm font-semibold text-center"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
              color: "#22c55e", fontFamily: "var(--font-dm-sans)" }}>
            Get It Now — $27
          </a>
        </motion.div>

        <motion.button type="button" onClick={share}
          className="flex items-center justify-center gap-2 rounded-2xl py-3"
          style={{ background: "rgba(4,30,58,0.7)", border: "1px solid rgba(10,61,107,0.7)", color: "#00C2FF", fontFamily: "var(--font-dm-sans)", fontSize: "0.875rem" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          whileTap={{ scale: 0.97 }}>
          Share My Results ↗
        </motion.button>

        <p className="pb-6 text-center text-xs" style={{ color: "rgba(230,251,255,0.2)", fontFamily: "var(--font-dm-sans)" }}>
          Estimates only. Speak with a licensed broker for a formal assessment.
        </p>
      </div>
    </div>

    {/* ── Sliding bottom banner — appears after 20 seconds ─────────────────── */}
    <AnimatePresence>
      {showBanner && !bannerDismissed && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe pb-4 pt-4"
          style={{ background: "rgba(2,11,24,0.97)", borderTop: "1.5px solid rgba(34,197,94,0.55)",
            boxShadow: "0 -6px 40px -8px rgba(34,197,94,0.45)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.15rem",
                color: "#22c55e", letterSpacing: "0.04em", marginBottom: 4 }}>
                {bannerCopy}
              </p>
              <a href={CALENDLY_URL} target="_blank" rel="noreferrer"
                className="mt-2 block w-full rounded-xl py-3 text-sm font-semibold text-center"
                style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18",
                  fontFamily: "var(--font-dm-sans)" }}>
                Book Now →
              </a>
            </div>
            <button type="button" onClick={() => setBannerDismissed(true)}
              className="mt-0.5 shrink-0 rounded-full p-1"
              style={{ color: "rgba(230,251,255,0.4)", background: "rgba(10,61,107,0.5)" }}
              aria-label="Dismiss">
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
