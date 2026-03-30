"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import { ResultsPopup } from "@/components/ui/ResultsPopup";
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
    : "realistic budget — what your income can service";

  // Qualification: next property budget >= $500k
  const qualified = r.totalBudget >= 500_000;

  const [showBanner, setShowBanner]           = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowBanner(true), 15_000);
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
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#e6fbff", letterSpacing: "0.05em", marginBottom: 8 }}>Equity &amp; Borrowing</p>
          {[
            { label: "Property value",              value: formatCurrency(quiz.currentPropertyValue ?? 0), colour: "#e6fbff" },
            { label: "Loan balance",                 value: `− ${formatCurrency(quiz.currentLoanBalance ?? 0)}`, colour: "#ef4444" },
            { label: "Accessible equity (80% LVR)",  value: formatCurrency(r.usableEquity),  colour: "#00C2FF" },
            { label: "Max additional borrowing",     value: formatCurrency(r.maxAdditionalBorrowing),  colour: "#7FFFFF" },
            { label: "Affordable equity draw",       value: formatCurrency(r.affordableEquityDraw),
              colour: isServiceabilityCapped ? "#f59e0b" : "#22c55e" },
          ].map((row, i) => (
            <div key={row.label} className={`flex justify-between py-1.5 ${i > 0 ? "border-t" : ""}`}
              style={{ borderColor: "rgba(10,61,107,0.4)" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>{row.label}</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1rem", color: row.colour }}>{row.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Equity draw warning — always shown when keeping */}
        {plan !== "selling" && (
          <motion.div className="rounded-2xl px-4 py-3"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1rem", color: "#f59e0b", letterSpacing: "0.05em", marginBottom: 4 }}>
              Equity Access = More Debt
            </p>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem", color: "rgba(230,251,255,0.55)", lineHeight: 1.5 }}>
              Drawing equity means refinancing your existing loan. Your current repayment of {formatCurrency(r.existingRepayBefore)}/mo would increase to {formatCurrency(r.existingRepayAfterDraw)}/mo after accessing {formatCurrency(r.affordableEquityDraw)} in equity.
              {isServiceabilityCapped && ` You have ${formatCurrency(r.usableEquity)} accessible equity, but your income limits you to ${formatCurrency(r.maxAdditionalBorrowing)} in total additional borrowing across equity draw and new loan combined.`}
            </p>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div className="grid grid-cols-2 gap-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <StatCard
            label="Accessible Equity"
            value={formatCurrency(r.usableEquity)}
            sub="at 80% LVR"
            colour="#00C2FF"
          />
          <StatCard
            label="Max Additional Borrowing"
            value={formatCurrency(r.maxAdditionalBorrowing)}
            sub="income-based capacity"
            colour="#7FFFFF"
          />
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
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.55)" }}>Repayment after equity draw</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem", color: "#ef4444" }}>− {formatCurrency(r.existingRepayAfterDraw)}/mo</span>
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
            {/* Book Free Call — primary CTA for qualified */}
            <motion.div className="rounded-2xl px-5 py-5 text-center"
              style={{ background: "rgba(34,197,94,0.08)", border: "2px solid rgba(34,197,94,0.5)",
                boxShadow: "0 0 36px -12px rgba(34,197,94,0.4)" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
              <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.5rem", color: "#22c55e", letterSpacing: "0.04em" }}>
                Book a Free Call
              </p>
              <p className="mt-1 mb-4" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.5)", lineHeight: 1.5 }}>
                You could get into a {formatCurrency(r.totalBudget)} next property. Book a free 15-minute call with one of our brokers to walk through your options.
              </p>
              <a href={CALENDLY_URL} target="_blank" rel="noreferrer"
                className="block w-full rounded-xl py-3 text-base font-semibold text-center"
                style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18", fontFamily: "var(--font-dm-sans)" }}>
                Book a Free Call →
              </a>
            </motion.div>
            {/* $27 accelerator — secondary CTA for qualified */}
            <motion.div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(4,30,58,0.85)", border: "1.5px solid rgba(245,158,11,0.5)",
                boxShadow: "0 0 48px -16px rgba(245,158,11,0.35), inset 0 1px 0 rgba(245,158,11,0.12)" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
              <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(245,158,11,0.18)" }}>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.45rem",
                  color: "#fbbf24", letterSpacing: "0.04em", lineHeight: 1.15 }}>
                  Want to maximise your position? Get your personalised buying plan
                </p>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3">
                {[
                  `Your personalised next property roadmap based on your income of ${formatCurrency(quiz.annualIncome ?? 0)}`,
                  `Custom equity & borrowing tracker built around your accessible equity of ${formatCurrency(r.usableEquity)}`,
                  `Step-by-step strategy for accessing equity and maximising borrowing capacity`,
                  `Rate comparison and refinance assessment for your current loan`,
                  `Priority broker callback — skip the queue when you're ready to move`,
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem",
                      color: "#fbbf24", fontWeight: 700, lineHeight: 1.5, flexShrink: 0 }}>✓</span>
                    <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem",
                      color: "rgba(230,251,255,0.75)", lineHeight: 1.5 }}>{item}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                <a href={STRIPE_URL} target="_blank" rel="noreferrer"
                  className="block w-full rounded-xl py-4 text-base font-bold text-center"
                  style={{ background: "linear-gradient(135deg,#92400e,#d97706,#fbbf24)",
                    color: "#020B18", fontFamily: "var(--font-dm-sans)",
                    boxShadow: "0 0 28px -6px rgba(245,158,11,0.55)", letterSpacing: "0.01em" }}>
                  Get My Custom Plan — $27
                </a>
                <div className="mt-3 flex items-center justify-center gap-4">
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.35)" }}>
                    ⚡ Instant delivery to your email
                  </p>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.35)" }}>
                    ✓ 30-day money-back guarantee
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          <motion.div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(4,30,58,0.85)", border: "1.5px solid rgba(245,158,11,0.5)",
              boxShadow: "0 0 48px -16px rgba(245,158,11,0.35), inset 0 1px 0 rgba(245,158,11,0.12)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(245,158,11,0.18)" }}>
              <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.45rem",
                color: "#fbbf24", letterSpacing: "0.04em", lineHeight: 1.15 }}>
                Your Next Property Accelerator — $27
              </p>
              <p className="mt-1" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem",
                color: "rgba(245,158,11,0.6)" }}>
                Everything you need to make your next move
              </p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              {[
                `Your personalised next property roadmap based on your income of ${formatCurrency(quiz.annualIncome ?? 0)}`,
                `Custom equity & borrowing tracker built around your accessible equity of ${formatCurrency(r.usableEquity)}`,
                `Step-by-step strategy for accessing equity and maximising borrowing capacity`,
                `Rate comparison and refinance assessment for your current loan`,
                `Priority broker callback — skip the queue when you're ready to move`,
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem",
                    color: "#fbbf24", fontWeight: 700, lineHeight: 1.5, flexShrink: 0 }}>✓</span>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem",
                    color: "rgba(230,251,255,0.75)", lineHeight: 1.5 }}>{item}</p>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5">
              <a href={STRIPE_URL} target="_blank" rel="noreferrer"
                className="block w-full rounded-xl py-4 text-base font-bold text-center"
                style={{ background: "linear-gradient(135deg,#92400e,#d97706,#fbbf24)",
                  color: "#020B18", fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 0 28px -6px rgba(245,158,11,0.55)", letterSpacing: "0.01em" }}>
                Get My Custom Plan — $27
              </a>
              <div className="mt-3 flex items-center justify-center gap-4">
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.35)" }}>
                  ⚡ Instant delivery to your email
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.35)" }}>
                  ✓ 30-day money-back guarantee
                </p>
              </div>
            </div>
          </motion.div>
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

    {/* ── Popup overlay — appears after 15 seconds ─────────────────────────── */}
    <ResultsPopup show={showBanner && !bannerDismissed} onDismiss={() => setBannerDismissed(true)}>
      {qualified ? (
        <div className="rounded-2xl px-5 py-6 text-center"
          style={{ background: "rgba(2,11,24,0.97)", border: "2px solid rgba(34,197,94,0.55)",
            boxShadow: "0 0 60px -12px rgba(34,197,94,0.5)" }}>
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.8rem", color: "#22c55e",
            letterSpacing: "0.04em", lineHeight: 1.15 }}>
            You could get into a {formatCurrency(r.totalBudget)} next property
          </p>
          <p className="mt-3 mb-5" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem",
            color: "rgba(230,251,255,0.6)", lineHeight: 1.6 }}>
            We&apos;d love to give you a free 15-minute call with one of our brokers to walk through your options.
          </p>
          <a href={CALENDLY_URL} target="_blank" rel="noreferrer"
            className="block w-full rounded-xl py-3.5 text-base font-bold text-center"
            style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18",
              fontFamily: "var(--font-dm-sans)" }}>
            Book a Free Call →
          </a>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(4,30,58,0.97)", border: "1.5px solid rgba(245,158,11,0.5)",
            boxShadow: "0 0 60px -12px rgba(245,158,11,0.4)" }}>
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(245,158,11,0.18)" }}>
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.45rem",
              color: "#fbbf24", letterSpacing: "0.04em", lineHeight: 1.15 }}>
              Your Next Property Accelerator — $27
            </p>
            <p className="mt-1" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem",
              color: "rgba(245,158,11,0.6)" }}>
              Everything you need to make your next move
            </p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {[
              `Your personalised next property roadmap based on your income of ${formatCurrency(quiz.annualIncome ?? 0)}`,
              `Custom equity & borrowing tracker built around your accessible equity of ${formatCurrency(r.usableEquity)}`,
              `Step-by-step strategy for accessing equity and maximising borrowing capacity`,
              `Rate comparison and refinance assessment for your current loan`,
              `Priority broker callback — skip the queue when you're ready to move`,
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem",
                  color: "#fbbf24", fontWeight: 700, lineHeight: 1.5, flexShrink: 0 }}>✓</span>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem",
                  color: "rgba(230,251,255,0.75)", lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5">
            <a href={STRIPE_URL} target="_blank" rel="noreferrer"
              className="block w-full rounded-xl py-4 text-base font-bold text-center"
              style={{ background: "linear-gradient(135deg,#92400e,#d97706,#fbbf24)",
                color: "#020B18", fontFamily: "var(--font-dm-sans)",
                boxShadow: "0 0 28px -6px rgba(245,158,11,0.55)", letterSpacing: "0.01em" }}>
              Get My Custom Plan — $27
            </a>
            <div className="mt-3 flex items-center justify-center gap-4">
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.35)" }}>
                ⚡ Instant delivery to your email
              </p>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.35)" }}>
                ✓ 30-day money-back guarantee
              </p>
            </div>
          </div>
        </div>
      )}
    </ResultsPopup>
    </>
  );
}
