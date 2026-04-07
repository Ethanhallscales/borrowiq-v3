"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import { ResultsPopup } from "@/components/ui/ResultsPopup";
import type { QuizData } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { trackNHResults, trackSchedule, trackInitiateCheckout } from "@/lib/pixel";

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? "#";
const STRIPE_URL   = process.env.NEXT_PUBLIC_STRIPE_LINK  ?? "#";

interface Props { quiz: QuizData; }

export default function ScreenN9ResultsB({ quiz }: Props) {
  const [showBanner, setShowBanner]           = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    trackNHResults(true);
    const t = setTimeout(() => setShowBanner(true), 15_000);
    return () => clearTimeout(t);
  }, []);

  const portfolioCount    = quiz.portfolioCount ?? 0;
  const hasProperties     = portfolioCount > 0;
  const totalPropertyValue = quiz.totalPropertyValue ?? 0;
  const totalLoanBalance   = quiz.totalLoanBalance ?? 0;
  const annualIncome       = quiz.annualIncome ?? 0;
  const partnerIncome      = quiz.partnerIncome ?? 0;
  const isPartner          = quiz.buyingSituation === "partner";
  const goal               = quiz.nextPropertyGoal === "investment"
    ? "Investment property"
    : "Home to live in";
  const displayIncome = formatCurrency(annualIncome);
  const displaySavings = formatCurrency(quiz.cashSavings ?? 0);

  // Summary rows
  const summaryRows: { label: string; value: string }[] = [
    { label: "Goal", value: goal },
    { label: "Properties owned", value: portfolioCount === 0 ? "0 (previously owned)" : portfolioCount >= 99 ? "3+" : String(portfolioCount) },
  ];
  if (hasProperties) {
    summaryRows.push({ label: "Total property value", value: formatCurrency(totalPropertyValue) });
    summaryRows.push({ label: "Total loan balance", value: formatCurrency(totalLoanBalance) });
  }
  summaryRows.push({ label: "Gross income", value: isPartner ? `${formatCurrency(annualIncome)} + ${formatCurrency(partnerIncome)} (partner)` : formatCurrency(annualIncome) });
  summaryRows.push({ label: "Cash savings", value: displaySavings });
  if (hasProperties && (quiz.monthlyRentalIncome ?? 0) > 0) {
    summaryRows.push({ label: "Monthly rental income", value: formatCurrency(quiz.monthlyRentalIncome ?? 0) });
  }

  return (
    <>
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.15} />
      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-5 pb-16 pt-10">

        {/* ── Heading ─────────────────────────────────────────────────────── */}
        <motion.div className="mb-6 text-center"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.4)" }}>
            <span style={{ fontSize: "1.6rem" }}>✓</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.8rem,8vw,2.6rem)",
            color: "#e6fbff", letterSpacing: "0.04em", lineHeight: 1.1 }}>
            Thanks for submitting your details
          </h1>
        </motion.div>

        {/* ── Message ─────────────────────────────────────────────────────── */}
        <motion.div className="mb-6 rounded-2xl px-4 py-4"
          style={{ background: "rgba(0,194,255,0.06)", border: "1px solid rgba(0,194,255,0.25)" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.88rem",
            color: "rgba(230,251,255,0.75)", lineHeight: 1.65 }}>
            Due to the complexity of your situation, one of our brokers will personally review your details and send you a tailored breakdown via email. This usually takes less than 24 hours.
          </p>
        </motion.div>

        {/* ── Summary of entered data ─────────────────────────────────────── */}
        <motion.div className="mb-6 rounded-2xl px-4 py-4"
          style={{ background: "rgba(4,30,58,0.7)", border: "1px solid rgba(10,61,107,0.55)" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "0.8rem", letterSpacing: "0.12em",
            color: "rgba(0,194,255,0.5)", textTransform: "uppercase", marginBottom: 10 }}>
            Your details
          </p>
          {summaryRows.map((row, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "7px 0",
              borderBottom: i < summaryRows.length - 1 ? "1px solid rgba(10,61,107,0.35)" : "none",
            }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem",
                color: "rgba(230,251,255,0.5)" }}>{row.label}</span>
              <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1rem",
                color: "#e6fbff", letterSpacing: "0.03em" }}>{row.value}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Booking CTA ─────────────────────────────────────────────────── */}
        <motion.div className="mb-5 rounded-2xl px-4 py-5 text-center"
          style={{ background: "rgba(34,197,94,0.08)", border: "2px solid rgba(34,197,94,0.5)",
            boxShadow: "0 0 36px -12px rgba(34,197,94,0.4)" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.35rem", color: "#22c55e",
            letterSpacing: "0.04em", marginBottom: 6 }}>
            Want to speed things up?
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem",
            color: "rgba(230,251,255,0.55)", lineHeight: 1.55, marginBottom: 14 }}>
            Book a free 15-minute call and we&apos;ll walk through everything live.
          </p>
          <a href={CALENDLY_URL} target="_blank" rel="noreferrer" onClick={() => trackSchedule("next_home")}
            className="block w-full rounded-xl py-3.5 text-base font-semibold text-center"
            style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18",
              fontFamily: "var(--font-dm-sans)" }}>
            Book Now →
          </a>
        </motion.div>

        {/* ── $27 Product Card (same layout as Path A) ────────────────────── */}
        <motion.div className="mb-5 rounded-2xl overflow-hidden"
          style={{ background: "rgba(4,30,58,0.85)", border: "1.5px solid rgba(245,158,11,0.5)",
            boxShadow: "0 0 48px -16px rgba(245,158,11,0.35), inset 0 1px 0 rgba(245,158,11,0.12)" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}>
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
              `Your personalised next property roadmap based on your income of ${displayIncome}`,
              `Custom equity & borrowing tracker built around your portfolio`,
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
          <div className="mx-5 mb-4 rounded-xl px-4 py-3"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.76rem",
              color: "rgba(245,158,11,0.8)", lineHeight: 1.5 }}>
              Built specifically for someone earning {displayIncome} with {displaySavings} in savings
            </p>
          </div>
          <div className="px-5 pb-5">
            <a href={STRIPE_URL} target="_blank" rel="noreferrer" onClick={() => trackInitiateCheckout()}
              className="block w-full rounded-xl py-4 text-base font-bold text-center"
              style={{ background: "linear-gradient(135deg,#92400e,#d97706,#fbbf24)",
                color: "#020B18", fontFamily: "var(--font-dm-sans)",
                boxShadow: "0 0 28px -6px rgba(245,158,11,0.55)", letterSpacing: "0.01em" }}>
              Get My Custom Plan — $27
            </a>
            <div className="mt-3 flex items-center justify-center gap-4">
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem",
                color: "rgba(230,251,255,0.35)" }}>⚡ Instant delivery to your email</p>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem",
                color: "rgba(230,251,255,0.35)" }}>✓ 30-day money-back guarantee</p>
            </div>
          </div>
        </motion.div>

        <p className="pb-6 text-center text-xs leading-relaxed"
          style={{ color: "rgba(230,251,255,0.2)", fontFamily: "var(--font-dm-sans)" }}>
          This is an estimate only. Speak with a licensed mortgage broker before making any financial decisions.
        </p>
      </div>
    </div>

    {/* ── Popup overlay — appears after 15 seconds ─────────────────────────── */}
    <ResultsPopup show={showBanner && !bannerDismissed} onDismiss={() => setBannerDismissed(true)}>
      <div className="rounded-2xl px-5 py-6 text-center"
        style={{ background: "rgba(2,11,24,0.97)", border: "2px solid rgba(34,197,94,0.55)",
          boxShadow: "0 0 60px -12px rgba(34,197,94,0.5)" }}>
        <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.6rem", color: "#22c55e",
          letterSpacing: "0.04em", lineHeight: 1.15 }}>
          Want answers faster?
        </p>
        <p className="mt-3 mb-5" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem",
          color: "rgba(230,251,255,0.6)", lineHeight: 1.6 }}>
          Book a free 15-minute call and we&apos;ll walk through your options live with a broker.
        </p>
        <a href={CALENDLY_URL} target="_blank" rel="noreferrer" onClick={() => trackSchedule("next_home")}
          className="block w-full rounded-xl py-3.5 text-base font-bold text-center"
          style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18",
            fontFamily: "var(--font-dm-sans)" }}>
          Book a Free Call →
        </a>
      </div>
    </ResultsPopup>
    </>
  );
}
