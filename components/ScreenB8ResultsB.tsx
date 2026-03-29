"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import type { QuizData } from "@/lib/types";
import { calculatePathB, formatCurrency } from "@/lib/calculations";

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

export default function ScreenB8ResultsB({ quiz }: Props) {
  const r    = useMemo(() => calculatePathB(quiz), [quiz]);
  const hero = useCountUp(r.totalBudget, 2200);
  const plan = quiz.currentPropertyPlan;

  const isServiceabilityCapped = r.affordableEquityDraw < r.usableEquity;
  const heroSub = plan === "selling"
    ? "net proceeds + new borrowing capacity"
    : "serviceability-based budget";

  // Qualification: next property budget >= $500k
  const qualified = r.totalBudget >= 500_000;

  const [showBanner, setShowBanner]           = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowBanner(true), 20_000);
    return () => clearTimeout(t);
  }, []);

  function share() {
    if (!navigator.share) return;
    navigator.share({ title: "My Property Budget", text: `My next property budget is ${formatCurrency(r.totalBudget)}!`, url: window.location.href });
  }

  return (
    <>
    <div className="relative flex h-dvh w-full flex-col overflow-y-auto overflow-x-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.4} />

      <div className="relative z-10 flex flex-col gap-6 px-5 pb-12 pt-10">

        {/* Hero */}
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.45)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Your next property budget</p>
          <div className="mt-2 leading-none"
            style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(2.8rem,14vw,4.5rem)", letterSpacing: "0.02em",
              background: "linear-gradient(135deg,#00C2FF,#7FFFFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ${hero.toLocaleString("en-AU")}
          </div>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", color: "rgba(230,251,255,0.3)", marginTop: 6 }}>
            {heroSub}
          </p>
        </motion.div>

        {/* Equity visual */}
        <motion.div className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(0,194,255,0.06)", border: "1px solid rgba(0,194,255,0.25)" }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#e6fbff", letterSpacing: "0.05em", marginBottom: 8 }}>Equity Breakdown</p>
          {[
            { label: "Property value",         value: formatCurrency(quiz.currentPropertyValue ?? 0), colour: "#e6fbff" },
            { label: "Loan balance",            value: `− ${formatCurrency(quiz.currentLoanBalance ?? 0)}`, colour: "#ef4444" },
            { label: "Gross equity",            value: formatCurrency(r.grossEquity),   colour: "#7FFFFF" },
            { label: "Usable equity (80% LVR)", value: formatCurrency(r.usableEquity),  colour: "#00C2FF" },
            { label: "Affordable equity draw",  value: formatCurrency(r.affordableEquityDraw),
              colour: isServiceabilityCapped ? "#f59e0b" : "#22c55e" },
          ].map((row, i) => (
            <div key={row.label} className={`flex justify-between py-1.5 ${i > 0 ? "border-t" : ""}`}
              style={{ borderColor: "rgba(10,61,107,0.4)" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>{row.label}</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1rem", color: row.colour }}>{row.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Serviceability note — shown when income limits equity access */}
        {plan !== "selling" && isServiceabilityCapped && (
          <motion.div className="rounded-2xl px-4 py-3"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1rem", color: "#f59e0b", letterSpacing: "0.05em", marginBottom: 4 }}>
              Income Limits Equity Access
            </p>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem", color: "rgba(230,251,255,0.55)", lineHeight: 1.5 }}>
              You have {formatCurrency(r.usableEquity)} in usable equity, but drawing it means borrowing against your property — which increases your total debt. Based on your income, you can service a maximum of {formatCurrency(r.affordableEquityDraw + (quiz.currentLoanBalance ?? 0))} in total debt, leaving {formatCurrency(r.affordableEquityDraw)} available to draw.
            </p>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div className="grid grid-cols-2 gap-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <StatCard
            label="Affordable Equity Draw"
            value={formatCurrency(r.affordableEquityDraw)}
            sub={isServiceabilityCapped && plan !== "selling" ? "income-limited" : "80% LVR available"}
            colour={isServiceabilityCapped && plan !== "selling" ? "#f59e0b" : "#00C2FF"}
          />
          <StatCard label="Usable Equity (80% LVR)" value={formatCurrency(r.usableEquity)} colour="#7FFFFF" />
          <StatCard label="New Monthly Repayment" value={formatCurrency(r.monthlyRepayment)} sub="on all new debt, 6.2%" />
          <StatCard label="New LVR"               value={`${r.newLvr}%`}
            colour={r.newLvr > 90 ? "#ef4444" : r.newLvr > 80 ? "#f59e0b" : "#22c55e"} />
        </motion.div>

        {/* Scenario: Selling */}
        {plan === "selling" && r.netSaleProceeds != null && (
          <motion.div className="rounded-2xl px-4 py-4"
            style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.3)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#22c55e", letterSpacing: "0.05em", marginBottom: 6 }}>If You Sell</p>
            {[
              { l: "Property value",   v: formatCurrency(quiz.currentPropertyValue ?? 0) },
              { l: "Loan payout",      v: `− ${formatCurrency(quiz.currentLoanBalance ?? 0)}` },
              { l: "Agent fees (2.5%)", v: `− ${formatCurrency((quiz.currentPropertyValue ?? 0) * 0.025)}` },
              { l: "Marketing / misc", v: "− $5,000" },
              { l: "Net sale proceeds", v: formatCurrency(r.netSaleProceeds!) },
            ].map(row => (
              <div key={row.l} className="flex justify-between py-1" style={{ borderTop: "1px solid rgba(34,197,94,0.15)" }}>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>{row.l}</span>
                <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1rem", color: "#e6fbff" }}>{row.v}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Scenario: Keeping */}
        {plan === "keeping" && r.monthlyRentalEst != null && (
          <motion.div className="rounded-2xl px-4 py-4"
            style={{ background: "rgba(0,194,255,0.07)", border: "1px solid rgba(0,194,255,0.25)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#00C2FF", letterSpacing: "0.05em", marginBottom: 6 }}>Rental Income Estimate</p>
            <div className="flex justify-between py-1">
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>Est. monthly rent (4% yield)</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#7FFFFF" }}>{formatCurrency(r.monthlyRentalEst!)}/mo</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderTop: "1px solid rgba(10,61,107,0.4)" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>Current repayment</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#ef4444" }}>− {formatCurrency(quiz.currentMonthlyRepayment ?? 0)}/mo</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderTop: "1px solid rgba(10,61,107,0.4)" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>Net monthly position</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.2rem",
                color: (r.netMonthlyCashflow ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}>
                {(r.netMonthlyCashflow ?? 0) >= 0 ? "+" : ""}{formatCurrency(r.netMonthlyCashflow ?? 0)}/mo
              </span>
            </div>
          </motion.div>
        )}

        {/* Scenario: Undecided - show both */}
        {plan === "undecided" && (
          <motion.div className="rounded-2xl px-4 py-4"
            style={{ background: "rgba(127,255,255,0.06)", border: "1px solid rgba(127,255,255,0.2)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#7FFFFF", letterSpacing: "0.05em", marginBottom: 8 }}>Side-by-Side Comparison</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl px-3 py-3 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.5)", textTransform: "uppercase" }}>If Selling</p>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.2rem", color: "#22c55e" }}>{formatCurrency(r.netSaleProceeds ?? 0)}</p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.65rem", color: "rgba(230,251,255,0.35)" }}>net proceeds</p>
              </div>
              <div className="rounded-xl px-3 py-3 text-center" style={{ background: "rgba(0,194,255,0.08)", border: "1px solid rgba(0,194,255,0.3)" }}>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.5)", textTransform: "uppercase" }}>If Keeping</p>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.2rem", color: "#00C2FF" }}>{formatCurrency(r.monthlyRentalEst ?? 0)}/mo</p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.65rem", color: "rgba(230,251,255,0.35)" }}>est. rental</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Permanent CTA cards ────────────────────────────────────────────── */}
        {qualified ? (
          <>
            <motion.div className="rounded-2xl px-5 py-5 text-center"
              style={{ background: "rgba(34,197,94,0.08)", border: "2px solid rgba(34,197,94,0.5)",
                boxShadow: "0 0 36px -12px rgba(34,197,94,0.4)" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
              <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.5rem", color: "#22c55e", letterSpacing: "0.04em" }}>
                Book a Free Call
              </p>
              <p className="mt-1 mb-4" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.5)" }}>
                You&apos;re in a strong position for your next property. Let&apos;s map out your move.
              </p>
              <a href={CALENDLY_URL} target="_blank" rel="noreferrer"
                className="block w-full rounded-xl py-3 text-base font-semibold text-center"
                style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18", fontFamily: "var(--font-dm-sans)" }}>
                Book Now →
              </a>
            </motion.div>
            <motion.div className="rounded-2xl px-5 py-4 text-center"
              style={{ background: "rgba(4,30,58,0.65)", border: "1px solid rgba(10,61,107,0.55)" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem", color: "rgba(230,251,255,0.65)", lineHeight: 1.5 }}>
                Want to accelerate your journey? Get a custom savings plan PDF and income tracker tool
              </p>
              <a href={STRIPE_URL} target="_blank" rel="noreferrer"
                className="mt-3 block w-full rounded-xl py-3 text-sm font-semibold text-center"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
                  color: "#22c55e", fontFamily: "var(--font-dm-sans)" }}>
                Get It Now — $27
              </a>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div className="rounded-2xl px-5 py-5 text-center"
              style={{ background: "rgba(245,158,11,0.07)", border: "2px solid rgba(245,158,11,0.45)" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
              <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.4rem", color: "#f59e0b", letterSpacing: "0.04em" }}>
                Get Your Custom Buying Plan
              </p>
              <p className="mt-1 mb-4" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.5)" }}>
                Includes personalised savings roadmap PDF and income tracker tool — $27
              </p>
              <a href={STRIPE_URL} target="_blank" rel="noreferrer"
                className="block w-full rounded-xl py-3 text-base font-semibold text-center"
                style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#020B18", fontFamily: "var(--font-dm-sans)" }}>
                Get Your Plan — $27
              </a>
            </motion.div>
            <motion.div className="rounded-2xl px-5 py-4 text-center"
              style={{ background: "rgba(4,30,58,0.65)", border: "1px solid rgba(10,61,107,0.55)" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem", color: "rgba(230,251,255,0.55)", lineHeight: 1.5 }}>
                Want to talk strategy? Book a free chat with a broker
              </p>
              <a href={CALENDLY_URL} target="_blank" rel="noreferrer"
                className="mt-3 block w-full rounded-xl py-3 text-sm font-semibold text-center"
                style={{ background: "rgba(0,194,255,0.1)", border: "1px solid rgba(0,194,255,0.3)",
                  color: "#00C2FF", fontFamily: "var(--font-dm-sans)" }}>
                Book a Free Chat →
              </a>
            </motion.div>
          </>
        )}

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

    {/* ── Sliding bottom banner ─────────────────────────────────────────────── */}
    <AnimatePresence>
      {showBanner && !bannerDismissed && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-4"
          style={{
            background: qualified ? "rgba(2,11,24,0.97)" : "rgba(20,12,2,0.97)",
            borderTop: qualified ? "1.5px solid rgba(34,197,94,0.55)" : "1.5px solid rgba(245,158,11,0.55)",
            boxShadow: qualified ? "0 -6px 40px -8px rgba(34,197,94,0.45)" : "0 -6px 40px -8px rgba(245,158,11,0.35)",
          }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.15rem",
                color: qualified ? "#22c55e" : "#f59e0b", letterSpacing: "0.04em", marginBottom: 4 }}>
                {qualified
                  ? "You're in a strong position for your next property"
                  : "You're closer than you think — get a custom plan to reach your buying goal"}
              </p>
              <a href={qualified ? CALENDLY_URL : STRIPE_URL} target="_blank" rel="noreferrer"
                className="mt-2 block w-full rounded-xl py-3 text-sm font-semibold text-center"
                style={{
                  background: qualified ? "linear-gradient(135deg,#0076BE,#00C2FF)" : "linear-gradient(135deg,#b45309,#f59e0b)",
                  color: "#020B18", fontFamily: "var(--font-dm-sans)",
                }}>
                {qualified ? "Book Now →" : "Get Your Plan — $27"}
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
