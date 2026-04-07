"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import { ResultsPopup } from "@/components/ui/ResultsPopup";
import type { QuizData } from "@/lib/types";
import {
  calculatePathN,
  computeAdditionalBorrowingN,
  calculateLMI_N,
  formatCurrency,
  pmtN,
  MARKET_RATE,
} from "@/lib/calculations";
import { calculateStampDutyPathB } from "@/lib/stamp-duty-pathb";
import { trackNHResults, trackSchedule, trackInitiateCheckout } from "@/lib/pixel";

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? "#";
const STRIPE_URL   = process.env.NEXT_PUBLIC_STRIPE_LINK  ?? "#";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props { quiz: QuizData; }

interface PriceBD {
  price:                number;
  deposit:              number;
  depositPct:           number;
  newLoan:              number;
  lmi:                  number;
  totalNewLoan:         number;  // newLoan + LMI
  newLvr:               number;
  stampDuty:            number;
  equityDrawn:          number;  // equity used for deposit + costs
  cashUsed:             number;
  cashRemaining:        number;
  monthlyRepayNew:      number;  // new loan at 6.2%, 30yr
  monthlyRepayExisting: number;  // (original loan + equity drawn) at 6.2%, 25yr
  combinedMonthly:      number;
  totalNewDebt:         number;  // equityDrawn + newLoan (must ≤ additionalBorrowing)
  loanExceedsCapacity:  boolean;
}

type BannerVariant = "green" | "teal" | "amber" | "red";

interface BannerInfo {
  variant: BannerVariant;
  icon:    string;
  title:   string;
  detail:  string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONV       = 2_800;   // conveyancing $2,000 + inspections $800
const STEP       = 25_000;
const SLIDER_MIN = 200_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snap(v: number, s: number) { return Math.round(v / s) * s; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ─── Animation hooks ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = Date.now();
    let id: number;
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return v;
}

function useTween(target: number, ms = 180): number {
  const [v, setV]   = useState(target);
  const prevRef     = useRef(target);
  const startRef    = useRef(0);
  const rafRef      = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;
    startRef.current = Date.now();
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      const p = Math.min((Date.now() - startRef.current) / ms, 1);
      setV(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 2))));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, ms]);
  return v;
}

// ─── computeAtPriceN — for 1+ properties ─────────────────────────────────────
// Step 9-11 from the spec: split borrowing at each price point.

function computeAtPriceN(
  price:               number,
  usableEquity:        number,
  cashSavings:         number,
  additionalBorrowing: number,
  totalLoanBalance:    number,
  isInvestment:        boolean,
): PriceBD {
  const stampDuty    = calculateStampDutyPathB(price);
  const totalCosts   = stampDuty + CONV;
  const minDepPct    = isInvestment ? 0.10 : 0.05;
  const deposit      = Math.round(price * minDepPct);

  // Step 9: Equity drawn = deposit - savings + costs
  // Cash covers costs first, then deposit. Equity covers the rest.
  const cashAvailableForUpfront = cashSavings;
  const totalUpfrontNeeded      = deposit + totalCosts;

  // Cash pays what it can; equity covers the rest
  const cashUsed     = Math.min(cashAvailableForUpfront, totalUpfrontNeeded);
  const equityNeeded = totalUpfrontNeeded - cashUsed;
  const equityDrawn  = Math.min(usableEquity, equityNeeded);
  const cashRemaining = cashSavings - cashUsed;

  // New loan = price - deposit
  const newLoan = price - deposit;

  // LMI: if deposit < 20% of price
  const lmi          = calculateLMI_N(newLoan, price);
  const totalNewLoan = newLoan + lmi;
  const newLvr       = price > 0 ? Math.round((newLoan / price) * 1000) / 10 : 0;
  const depositPct   = price > 0 ? deposit / price : 0;

  // Total new debt = equity drawn + new loan (both compete for additional borrowing)
  const totalNewDebt = equityDrawn + newLoan;

  // Step 11 — Monthly repayments at 6.2%
  // Existing: (original loan + equity drawn) at 6.2%, 25yr
  const monthlyRepayExisting = Math.round(pmtN(MARKET_RATE, totalLoanBalance + equityDrawn, 25 * 12));
  // New: (new loan + LMI) at 6.2%, 30yr
  const monthlyRepayNew = Math.round(pmtN(MARKET_RATE, totalNewLoan, 30 * 12));

  return {
    price,
    deposit,
    depositPct,
    newLoan,
    lmi,
    totalNewLoan,
    newLvr,
    stampDuty,
    equityDrawn,
    cashUsed,
    cashRemaining,
    monthlyRepayNew,
    monthlyRepayExisting,
    combinedMonthly: monthlyRepayExisting + monthlyRepayNew,
    totalNewDebt,
    loanExceedsCapacity: totalNewDebt > additionalBorrowing,
  };
}

// ─── computeAtPrice0 — for 0 properties ──────────────────────────────────────
// No equity, no existing loan. Budget = borrowing + savings - costs.

function computeAtPrice0(
  price:               number,
  cashSavings:         number,
  additionalBorrowing: number,
): PriceBD {
  const stampDuty  = calculateStampDutyPathB(price);
  const totalCosts = stampDuty + CONV;

  // Deposit = savings - costs (whatever's left after costs)
  const cashAfterCosts = cashSavings - totalCosts;
  const deposit        = Math.max(0, cashAfterCosts);
  const newLoan        = price - deposit;

  const lmi          = calculateLMI_N(newLoan, price);
  const totalNewLoan = newLoan + lmi;
  const newLvr       = price > 0 ? Math.round((newLoan / price) * 1000) / 10 : 0;
  const depositPct   = price > 0 ? deposit / price : 0;

  const cashUsed      = Math.min(cashSavings, totalCosts + deposit);
  const cashRemaining = cashSavings - cashUsed;

  // Total new debt = new loan + LMI (must fit within borrowing)
  const totalNewDebt    = newLoan + lmi;
  const monthlyRepayNew = Math.round(pmtN(MARKET_RATE, totalNewLoan, 30 * 12));

  return {
    price,
    deposit,
    depositPct,
    newLoan,
    lmi,
    totalNewLoan,
    newLvr,
    stampDuty,
    equityDrawn: 0,
    cashUsed,
    cashRemaining,
    monthlyRepayNew,
    monthlyRepayExisting: 0,
    combinedMonthly: monthlyRepayNew,
    totalNewDebt,
    loanExceedsCapacity: totalNewDebt > additionalBorrowing,
  };
}

// ─── findMaxAffordablePrice ──────────────────────────────────────────────────

function findMaxAffordablePrice(
  hasProperties:    boolean,
  usableEquity:     number,
  cashSavings:      number,
  totalLoanBalance: number,
  getAdditional:    (price: number) => number,
  isInvestment:     boolean,
): number {
  let lo = 0;
  let hi = 200; // steps above SLIDER_MIN → max $5.2M

  while (lo < hi) {
    const mid   = Math.floor((lo + hi + 1) / 2);
    const price = SLIDER_MIN + mid * STEP;
    const add   = getAdditional(price);
    const bd    = hasProperties
      ? computeAtPriceN(price, usableEquity, cashSavings, add, totalLoanBalance, isInvestment)
      : computeAtPrice0(price, cashSavings, add);
    if (bd.cashRemaining >= 0 && !bd.loanExceedsCapacity) lo = mid;
    else hi = mid - 1;
  }

  return SLIDER_MIN + lo * STEP;
}

// ─── getBannerN ──────────────────────────────────────────────────────────────

function getBannerN(bd: PriceBD, maxAffordable: number): BannerInfo {
  if (bd.cashRemaining < 0 || bd.loanExceedsCapacity) {
    return {
      variant: "red", icon: "\u26d4",
      title: "Beyond current capacity",
      detail: bd.cashRemaining < 0
        ? `You'd need an extra ${formatCurrency(Math.abs(bd.cashRemaining))} to cover costs here.`
        : "This price exceeds your borrowing capacity.",
    };
  }
  const pct = maxAffordable > 0 ? bd.price / maxAffordable : 1;
  if (pct < 0.5) return {
    variant: "green", icon: "\u2713",
    title: "Strong position \u2014 conservative leverage",
    detail: "Low risk entry \u2014 significant buffer between your property and full capacity.",
  };
  if (pct < 0.80) return {
    variant: "teal", icon: "\u2713",
    title: "Comfortable \u2014 good balance",
    detail: "Well within your capacity with room to absorb rate movements.",
  };
  if (pct <= 0.95) return {
    variant: "amber", icon: "\u26a0",
    title: "Approaching maximum leverage \u2014 talk to a broker about risk",
    detail: "Consider speaking with a broker about managing risk at this level.",
  };
  return {
    variant: "red", icon: "\u26d4",
    title: "Beyond current capacity",
    detail: "This price exceeds what lenders are likely to approve.",
  };
}

// ─── Banner colours ──────────────────────────────────────────────────────────

const BANNER_COLORS: Record<BannerVariant, { bg: string; border: string; icon: string; title: string }> = {
  green: { bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.30)", icon: "#22c55e", title: "#86efac" },
  teal:  { bg: "rgba(0,194,255,0.08)", border: "rgba(0,194,255,0.28)", icon: "#00C2FF", title: "#7ffbff" },
  amber: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)", icon: "#f59e0b", title: "#fcd34d" },
  red:   { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.30)", icon: "#ef4444", title: "#fca5a5" },
};

// ─── Row sub-component ───────────────────────────────────────────────────────

const ROW: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "6px 0", fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem",
  color: "rgba(230,251,255,0.7)",
};
const VAL: React.CSSProperties = {
  fontFamily: "var(--font-bebas-neue)", fontSize: "1rem", color: "#e6fbff",
  letterSpacing: "0.03em",
};
const SECTION_HEAD: React.CSSProperties = {
  fontFamily: "var(--font-bebas-neue)", fontSize: "0.75rem", letterSpacing: "0.12em",
  color: "rgba(0,194,255,0.5)", textTransform: "uppercase" as const,
  marginTop: 14, marginBottom: 6,
};
const DIVIDER: React.CSSProperties = { height: 1, background: "rgba(10,61,107,0.5)", margin: "10px 0" };

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ScreenN9ResultsB({ quiz }: Props) {
  const results = useMemo(() => calculatePathN(quiz), [quiz]);
  const {
    usableEquity,
    additionalBorrowing,
    existingMonthlyRepay,
    isOverleveraged,
    hasProperties,
    qualified,
  } = results;

  const cashSavings      = quiz.cashSavings        ?? 0;
  const monthlyRental    = quiz.monthlyRentalIncome ?? 0;
  const totalLoanBalance = quiz.totalLoanBalance    ?? 0;
  const isInvestment     = quiz.nextPropertyGoal === "investment";

  // ── Pixel tracking ────────────────────────────────────────────────────────
  const [showBanner, setShowBanner]           = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    trackNHResults(qualified);
    const t = setTimeout(() => setShowBanner(true), 15_000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Max affordable price ──────────────────────────────────────────────────
  const maxAffordablePrice = useMemo(() => {
    const getAdditional = isInvestment
      ? (p: number) => computeAdditionalBorrowingN(quiz, p * 0.04 * 0.8)
      : () => additionalBorrowing;
    return findMaxAffordablePrice(hasProperties, usableEquity, cashSavings, totalLoanBalance, getAdditional, isInvestment);
  }, [usableEquity, cashSavings, totalLoanBalance, additionalBorrowing, isInvestment, hasProperties, quiz]);

  // ── Staggered count-ups ───────────────────────────────────────────────────
  const [t1, setT1] = useState(0);
  const [t2, setT2] = useState(0);
  const [t3, setT3] = useState(0);

  useEffect(() => {
    if (hasProperties) {
      setT1(usableEquity);
      const id2 = setTimeout(() => setT2(additionalBorrowing), 700);
      const id3 = setTimeout(() => setT3(maxAffordablePrice),  1400);
      return () => { clearTimeout(id2); clearTimeout(id3); };
    } else {
      setT1(additionalBorrowing);
      const id2 = setTimeout(() => setT2(maxAffordablePrice), 700);
      return () => clearTimeout(id2);
    }
  }, [usableEquity, additionalBorrowing, maxAffordablePrice, hasProperties]);

  const c1 = useCountUp(t1, 1200);
  const c2 = useCountUp(t2, 1200);
  const c3 = useCountUp(t3, 1600);

  // ── Slider ────────────────────────────────────────────────────────────────
  const SLIDER_MAX = Math.max(SLIDER_MIN + 50_000, maxAffordablePrice + STEP * 2);
  const [selectedPrice, setSelectedPrice] = useState(() =>
    snap(clamp(maxAffordablePrice * 0.80, SLIDER_MIN, SLIDER_MAX), STEP)
  );

  // ── Dynamic additional borrowing (investment: increases as price rises) ──
  const dynamicAdditional = useMemo(() => {
    if (!isInvestment) return additionalBorrowing;
    return computeAdditionalBorrowingN(quiz, selectedPrice * 0.04 * 0.8);
  }, [isInvestment, additionalBorrowing, quiz, selectedPrice]);

  // ── Breakdown at selected price ───────────────────────────────────────────
  const bd = useMemo(() => {
    if (hasProperties) {
      return computeAtPriceN(selectedPrice, usableEquity, cashSavings, dynamicAdditional, totalLoanBalance, isInvestment);
    }
    return computeAtPrice0(selectedPrice, cashSavings, dynamicAdditional);
  }, [selectedPrice, usableEquity, cashSavings, dynamicAdditional, totalLoanBalance, isInvestment, hasProperties]);

  const banner = useMemo(() => getBannerN(bd, maxAffordablePrice), [bd, maxAffordablePrice]);
  const bc     = BANNER_COLORS[banner.variant];

  // ── Tweened values ────────────────────────────────────────────────────────
  const tDeposit         = useTween(bd.deposit);
  const tNewLoan         = useTween(bd.newLoan);
  const tLmi             = useTween(bd.lmi);
  const tTotalNewLoan    = useTween(bd.totalNewLoan);
  const tMonthlyNew      = useTween(bd.monthlyRepayNew);
  const tMonthlyExisting = useTween(bd.monthlyRepayExisting);
  const tStampDuty       = useTween(bd.stampDuty);
  const tCashRemaining   = useTween(bd.cashRemaining);
  const tEquityDrawn     = useTween(bd.equityDrawn);
  const tCombined        = useTween(bd.combinedMonthly);

  // ── Share ─────────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  async function handleShare() {
    const text = `My next property budget: ${formatCurrency(maxAffordablePrice)} via BorrowIQ by Assist Loans`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ── Investment gearing calcs ──────────────────────────────────────────────
  const weeklyRentNew   = Math.round((selectedPrice * 0.04) / 52);
  const weeklyRepayNew  = Math.round((bd.monthlyRepayNew * 12) / 52);
  const netWeekly       = weeklyRentNew - weeklyRepayNew;

  // ── Slider visual ─────────────────────────────────────────────────────────
  const sliderPct = ((selectedPrice - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  // ── Combined monthly with rental offset (for 1+ props) ───────────────────
  const totalMonthly = tMonthlyExisting + tMonthlyNew;
  const netMonthly   = totalMonthly - monthlyRental;

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <>
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.15} />
      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-4 pb-16 pt-8">

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <motion.div className="mb-6 text-center"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1rem", letterSpacing: "0.18em",
            color: "rgba(0,194,255,0.6)", textTransform: "uppercase" }}>
            Your Next Property Report
          </p>
        </motion.div>

        {/* Overleveraged warning (1+ props only) */}
        <AnimatePresence>
          {isOverleveraged && (
            <motion.div className="mb-4 rounded-2xl px-4 py-3"
              style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)" }}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "#fcd34d" }}>
                {"\u26a0"} Your properties may be overleveraged {"\u2014"} total debt exceeds total value. Your broker can help you map a path forward.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── COUNT-UP STATS ──────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-3">
          {hasProperties ? (
            /* 1+ properties: 3 numbers */
            <>
              {[
                { label: "Accessible Equity (80% LVR)", value: c1, delay: 0 },
                { label: "Additional Borrowing Power", value: c2, delay: 0.1 },
              ].map(({ label, value, delay }) => (
                <motion.div key={label} className="rounded-2xl px-4 py-3"
                  style={{ background: "rgba(4,30,58,0.6)", border: "1px solid rgba(10,61,107,0.6)" }}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay, duration: 0.4 }}>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", color: "rgba(230,251,255,0.4)",
                    letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</p>
                  <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)",
                    color: "#00C2FF", textShadow: "0 0 24px rgba(0,194,255,0.35)", letterSpacing: "0.03em", lineHeight: 1.1 }}>
                    {formatCurrency(value)}
                  </p>
                </motion.div>
              ))}
              {/* Budget — big hero */}
              <motion.div className="rounded-2xl px-4 py-4"
                style={{ background: "rgba(0,194,255,0.07)", border: "2px solid rgba(0,194,255,0.3)",
                  boxShadow: "0 0 48px -12px rgba(0,194,255,0.3)" }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", color: "rgba(0,194,255,0.6)",
                  letterSpacing: "0.08em", textTransform: "uppercase" }}>Next Property Budget</p>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(2.4rem,11vw,3.6rem)",
                  background: "linear-gradient(135deg, #00C2FF, #7ffbff)", WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent", letterSpacing: "0.03em", lineHeight: 1,
                  filter: "drop-shadow(0 0 20px rgba(0,194,255,0.5))" }}>
                  {formatCurrency(c3)}
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem",
                  color: "rgba(230,251,255,0.35)", marginTop: 4 }}>
                  Realistic budget after stamp duty &amp; costs
                </p>
              </motion.div>
            </>
          ) : (
            /* 0 properties: 2 numbers */
            <>
              <motion.div className="rounded-2xl px-4 py-3"
                style={{ background: "rgba(4,30,58,0.6)", border: "1px solid rgba(10,61,107,0.6)" }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0, duration: 0.4 }}>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", color: "rgba(230,251,255,0.4)",
                  letterSpacing: "0.06em", textTransform: "uppercase" }}>Borrowing Power</p>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)",
                  color: "#00C2FF", textShadow: "0 0 24px rgba(0,194,255,0.35)", letterSpacing: "0.03em", lineHeight: 1.1 }}>
                  {formatCurrency(c1)}
                </p>
              </motion.div>
              <motion.div className="rounded-2xl px-4 py-4"
                style={{ background: "rgba(0,194,255,0.07)", border: "2px solid rgba(0,194,255,0.3)",
                  boxShadow: "0 0 48px -12px rgba(0,194,255,0.3)" }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", color: "rgba(0,194,255,0.6)",
                  letterSpacing: "0.08em", textTransform: "uppercase" }}>Total Budget</p>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(2.4rem,11vw,3.6rem)",
                  background: "linear-gradient(135deg, #00C2FF, #7ffbff)", WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent", letterSpacing: "0.03em", lineHeight: 1,
                  filter: "drop-shadow(0 0 20px rgba(0,194,255,0.5))" }}>
                  {formatCurrency(c2)}
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem",
                  color: "rgba(230,251,255,0.35)", marginTop: 4 }}>
                  Borrowing power + savings after costs
                </p>
              </motion.div>
            </>
          )}
        </div>

        {/* ── SLIDER ──────────────────────────────────────────────────────── */}
        <motion.div className="mb-4 rounded-2xl px-4 py-5"
          style={{ background: "rgba(4,30,58,0.7)", border: "1px solid rgba(10,61,107,0.6)" }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", color: "rgba(230,251,255,0.4)",
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
            Explore a target price
          </p>
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(2rem,9vw,3rem)", color: "#00C2FF",
            letterSpacing: "0.03em", lineHeight: 1, textShadow: "0 0 32px rgba(0,194,255,0.4)", marginBottom: 12 }}>
            {formatCurrency(selectedPrice)}
          </p>

          <div className="relative mx-1 flex h-12 items-center">
            <div className="absolute inset-x-0 rounded-full" style={{ height: 6, background: "rgba(10,61,107,0.55)" }} />
            <div className="absolute left-0 rounded-full" style={{ height: 6, width: `${sliderPct}%`,
              background: banner.variant === "red" ? "linear-gradient(to right,#dc2626,#ef4444)"
                : banner.variant === "green" ? "linear-gradient(to right,#16a34a,#22c55e)"
                : "linear-gradient(to right,#0076BE,#00C2FF)" }} />
            <div className="pointer-events-none absolute -translate-x-1/2 rounded-full"
              style={{ left: `${sliderPct}%`, width: 44, height: 44,
                background: "linear-gradient(135deg,#0056A6,#00C2FF)",
                boxShadow: "0 0 20px 6px rgba(0,194,255,0.45)", border: "3px solid rgba(255,255,255,0.3)" }} />
            <input type="range" min={SLIDER_MIN} max={SLIDER_MAX} step={STEP}
              value={selectedPrice}
              onChange={e => setSelectedPrice(Number(e.target.value))}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
              style={{ height: "100%", touchAction: "none" }} />
          </div>
          <div className="mt-2 flex justify-between text-xs"
            style={{ color: "rgba(230,251,255,0.25)", fontFamily: "var(--font-dm-sans)" }}>
            <span>{formatCurrency(SLIDER_MIN)}</span>
            <span>Max: {formatCurrency(SLIDER_MAX)}</span>
          </div>
        </motion.div>

        {/* ── CONTEXT BANNER ──────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div key={banner.variant + banner.title}
            className="mb-4 flex items-start gap-3 rounded-2xl px-4 py-3"
            style={{ background: bc.bg, border: `1px solid ${bc.border}` }}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}>
            <span style={{ fontSize: "1.1rem", color: bc.icon, flexShrink: 0, marginTop: 1 }}>{banner.icon}</span>
            <div>
              <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1rem", color: bc.title, letterSpacing: "0.04em" }}>
                {banner.title}
              </p>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.73rem", color: "rgba(230,251,255,0.55)", marginTop: 2 }}>
                {banner.detail}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── LIVE BREAKDOWN ──────────────────────────────────────────────── */}
        <motion.div className="mb-4 rounded-2xl px-4 py-4"
          style={{ background: "rgba(4,30,58,0.65)", border: "1px solid rgba(10,61,107,0.6)" }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <p style={{ ...SECTION_HEAD, marginTop: 0 }}>Live Breakdown</p>

          {/* Property price */}
          <div style={ROW}>
            <span>Property price</span>
            <span style={VAL}>{formatCurrency(selectedPrice)}</span>
          </div>

          {/* Deposit */}
          <div style={ROW}>
            <span>{hasProperties ? "Deposit" : "Deposit from savings"}</span>
            <span style={VAL}>{formatCurrency(tDeposit)} ({Math.round(bd.depositPct * 100)}%)</span>
          </div>

          {/* Equity draw (1+ props only) */}
          {hasProperties && tEquityDrawn > 0 && (
            <div style={ROW}>
              <span>Equity draw needed</span>
              <span style={VAL}>{formatCurrency(tEquityDrawn)}</span>
            </div>
          )}

          {/* New loan */}
          <div style={ROW}>
            <span>New loan amount</span>
            <span style={VAL}>{formatCurrency(tNewLoan)}</span>
          </div>

          {/* Stamp duty */}
          <div style={ROW}>
            <span>Stamp duty</span>
            <span style={{ ...VAL, color: tStampDuty > 0 ? "#f59e0b" : "#22c55e" }}>
              {tStampDuty > 0 ? `\u2212${formatCurrency(tStampDuty)}` : "$0"}
            </span>
          </div>

          {/* LMI card */}
          <div className="my-2 rounded-xl px-3 py-2"
            style={{
              background: tLmi > 0 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)",
              border: `1px solid ${tLmi > 0 ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`,
            }}>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem",
              color: tLmi > 0 ? "#fcd34d" : "#86efac" }}>
              {tLmi > 0
                ? `LMI: ${formatCurrency(tLmi)} \u2014 added to your loan, not your upfront costs`
                : "LMI: $0 \u2014 not required \u2713"}
            </p>
          </div>

          {/* Conveyancing */}
          <div style={ROW}>
            <span>Conveyancing + inspections</span>
            <span style={{ ...VAL, color: "#f59e0b" }}>{`\u2212${formatCurrency(CONV)}`}</span>
          </div>

          <div style={DIVIDER} />

          {/* Monthly repayment on new loan */}
          <div style={ROW}>
            <span>Monthly repayment (new loan)</span>
            <span style={{ ...VAL, color: "#00C2FF" }}>{formatCurrency(tMonthlyNew)}/mo</span>
          </div>

          {/* Combined position (1+ props) */}
          {hasProperties && (
            <>
              <p style={SECTION_HEAD}>Combined Position</p>
              <div>
                <div style={ROW}>
                  <span>Existing loan repayment</span>
                  <span style={VAL}>{formatCurrency(tMonthlyExisting)}/mo</span>
                </div>
                {tEquityDrawn > 0 && (
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem",
                    color: "rgba(230,251,255,0.3)", marginTop: -2, marginBottom: 4 }}>
                    Was {formatCurrency(existingMonthlyRepay)}/mo before equity draw
                  </p>
                )}
              </div>
              <div style={ROW}>
                <span>New property repayment</span>
                <span style={VAL}>{formatCurrency(tMonthlyNew)}/mo</span>
              </div>
              <div style={{ ...ROW, fontWeight: 600, color: "#e6fbff" }}>
                <span>Combined monthly repayments</span>
                <span style={{ ...VAL, fontSize: "1.1rem" }}>{formatCurrency(tCombined)}/mo</span>
              </div>

              {/* Rental income offset */}
              {monthlyRental > 0 && (
                <>
                  <div style={ROW}>
                    <span>Existing rental income</span>
                    <span style={{ ...VAL, color: "#22c55e" }}>+{formatCurrency(monthlyRental)}/mo</span>
                  </div>
                  <div style={{ ...ROW, fontWeight: 600, color: "#e6fbff" }}>
                    <span>Net monthly cost</span>
                    <span style={{ ...VAL, fontSize: "1.1rem", color: netMonthly < 0 ? "#22c55e" : "#e6fbff" }}>
                      {netMonthly < 0 ? "+" : ""}{formatCurrency(Math.abs(netMonthly))}/mo
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          <div style={DIVIDER} />

          {/* Cash remaining */}
          <div style={{ ...ROW, marginTop: 4 }}>
            <span style={{ color: tCashRemaining >= 0 ? "rgba(230,251,255,0.7)" : "#fca5a5" }}>
              {tCashRemaining >= 0 ? "Cash savings remaining" : "Cash shortfall"}
            </span>
            <span style={{
              fontFamily: "var(--font-bebas-neue)",
              fontSize: tCashRemaining >= 0 ? "1.3rem" : "1.1rem",
              color: tCashRemaining >= 0 ? "#22c55e" : "#ef4444",
              textShadow: tCashRemaining >= 0 ? "0 0 20px rgba(34,197,94,0.45)" : "none",
            }}>
              {tCashRemaining >= 0 ? "+" : "\u2212"}{formatCurrency(Math.abs(tCashRemaining))}
            </span>
          </div>
        </motion.div>

        {/* ── INVESTMENT GEARING CARD ─────────────────────────────────────── */}
        {isInvestment && (
          <motion.div className="mb-4 rounded-2xl px-4 py-4"
            style={{ background: "rgba(4,30,58,0.65)", border: "1px solid rgba(10,61,107,0.6)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <p style={{ ...SECTION_HEAD, marginTop: 0 }}>Investment Analysis</p>
            <div style={ROW}>
              <span>Estimated weekly rent (new property)</span>
              <span style={{ ...VAL, color: "#22c55e" }}>{formatCurrency(weeklyRentNew)}/wk</span>
            </div>
            <div style={ROW}>
              <span>Weekly loan repayment</span>
              <span style={VAL}>{formatCurrency(weeklyRepayNew)}/wk</span>
            </div>
            <div style={DIVIDER} />
            <div className="rounded-xl px-3 py-2"
              style={{
                background: netWeekly >= 0 ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${netWeekly >= 0 ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
              }}>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem",
                color: netWeekly >= 0 ? "#86efac" : "#fcd34d", lineHeight: 1.5 }}>
                {netWeekly >= 0
                  ? `Positively geared \u2014 generating ${formatCurrency(Math.abs(netWeekly))}/week net income.`
                  : `Negatively geared by ${formatCurrency(Math.abs(netWeekly))}/week \u2014 common for investments, may offer tax benefits. Your broker can explain.`}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── CTAs ────────────────────────────────────────────────────────── */}
        {qualified ? (
          <>
            <motion.div className="mb-4 rounded-2xl px-4 py-5 text-center"
              style={{ background: "rgba(34,197,94,0.08)", border: "2px solid rgba(34,197,94,0.5)",
                boxShadow: "0 0 36px -12px rgba(34,197,94,0.4)" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.4rem", color: "#22c55e",
                letterSpacing: "0.04em", marginBottom: 6 }}>
                Book a Free Call
              </p>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem",
                color: "rgba(230,251,255,0.5)", lineHeight: 1.5, marginBottom: 14 }}>
                You could get into a {formatCurrency(maxAffordablePrice)} next property. Book a free 15-minute call with one of our brokers to walk through your options.
              </p>
              <a href={CALENDLY_URL} target="_blank" rel="noreferrer" onClick={() => trackSchedule("next_home")}
                className="block w-full rounded-xl py-3 text-base font-semibold text-center"
                style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18",
                  fontFamily: "var(--font-dm-sans)" }}>
                Book a Free Call {"\u2192"}
              </a>
            </motion.div>
            {/* $27 product */}
            <motion.div className="mb-4 rounded-2xl overflow-hidden"
              style={{ background: "rgba(4,30,58,0.85)", border: "1.5px solid rgba(245,158,11,0.5)",
                boxShadow: "0 0 48px -16px rgba(245,158,11,0.35)" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
              <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(245,158,11,0.18)" }}>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.35rem",
                  color: "#fbbf24", letterSpacing: "0.04em", lineHeight: 1.15 }}>
                  Want to maximise your position? Get your personalised buying plan
                </p>
              </div>
              <div className="px-4 py-3 flex flex-col gap-2.5">
                {[
                  `Your personalised next property roadmap based on your income of ${formatCurrency(quiz.annualIncome ?? 0)}`,
                  `Custom equity & borrowing tracker built around your portfolio`,
                  `Step-by-step strategy for accessing equity and maximising borrowing capacity`,
                  `Rate comparison and refinance assessment for your current loan`,
                  `Priority broker callback \u2014 skip the queue when you're ready to move`,
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem",
                      color: "#fbbf24", fontWeight: 700, lineHeight: 1.5, flexShrink: 0 }}>{"\u2713"}</span>
                    <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem",
                      color: "rgba(230,251,255,0.75)", lineHeight: 1.5 }}>{item}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4">
                <a href={STRIPE_URL} target="_blank" rel="noreferrer" onClick={() => trackInitiateCheckout()}
                  className="block w-full rounded-xl py-3.5 text-base font-bold text-center"
                  style={{ background: "linear-gradient(135deg,#92400e,#d97706,#fbbf24)",
                    color: "#020B18", fontFamily: "var(--font-dm-sans)",
                    boxShadow: "0 0 28px -6px rgba(245,158,11,0.55)" }}>
                  Get My Custom Plan {"\u2014"} $27
                </a>
                <div className="mt-2.5 flex items-center justify-center gap-4">
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem", color: "rgba(230,251,255,0.35)" }}>
                    {"\u26a1"} Instant delivery to your email
                  </p>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem", color: "rgba(230,251,255,0.35)" }}>
                    {"\u2713"} 30-day money-back guarantee
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          <motion.div className="mb-4 rounded-2xl overflow-hidden"
            style={{ background: "rgba(4,30,58,0.85)", border: "1.5px solid rgba(245,158,11,0.5)",
              boxShadow: "0 0 48px -16px rgba(245,158,11,0.35)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(245,158,11,0.18)" }}>
              <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.35rem",
                color: "#fbbf24", letterSpacing: "0.04em", lineHeight: 1.15 }}>
                Your Next Property Accelerator {"\u2014"} $27
              </p>
              <p className="mt-1" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem",
                color: "rgba(245,158,11,0.6)" }}>
                Everything you need to make your next move
              </p>
            </div>
            <div className="px-4 py-3 flex flex-col gap-2.5">
              {[
                `Your personalised next property roadmap based on your income of ${formatCurrency(quiz.annualIncome ?? 0)}`,
                `Custom equity & borrowing tracker built around your portfolio`,
                `Step-by-step strategy for accessing equity and maximising borrowing capacity`,
                `Rate comparison and refinance assessment for your current loan`,
                `Priority broker callback \u2014 skip the queue when you're ready to move`,
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem",
                    color: "#fbbf24", fontWeight: 700, lineHeight: 1.5, flexShrink: 0 }}>{"\u2713"}</span>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem",
                    color: "rgba(230,251,255,0.75)", lineHeight: 1.5 }}>{item}</p>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <a href={STRIPE_URL} target="_blank" rel="noreferrer" onClick={() => trackInitiateCheckout()}
                className="block w-full rounded-xl py-3.5 text-base font-bold text-center"
                style={{ background: "linear-gradient(135deg,#92400e,#d97706,#fbbf24)",
                  color: "#020B18", fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 0 28px -6px rgba(245,158,11,0.55)" }}>
                Get My Custom Plan {"\u2014"} $27
              </a>
              <div className="mt-2.5 flex items-center justify-center gap-4">
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem", color: "rgba(230,251,255,0.35)" }}>
                  {"\u26a1"} Instant delivery to your email
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem", color: "rgba(230,251,255,0.35)" }}>
                  {"\u2713"} 30-day money-back guarantee
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Share */}
        <motion.button type="button" onClick={handleShare}
          className="mb-4 w-full rounded-2xl py-3 text-sm"
          style={{ background: "rgba(4,30,58,0.6)", border: "1px solid rgba(10,61,107,0.6)",
            color: "rgba(230,251,255,0.5)", fontFamily: "var(--font-dm-sans)" }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          {copied ? "Copied! \u2713" : "Share my result \u2197"}
        </motion.button>

        <p className="pb-6 text-center text-xs leading-relaxed"
          style={{ color: "rgba(230,251,255,0.2)", fontFamily: "var(--font-dm-sans)" }}>
          This is an estimate only. Speak with a licensed mortgage broker before making any financial decisions.
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
            You could get into a {formatCurrency(maxAffordablePrice)} next property
          </p>
          <p className="mt-3 mb-5" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.85rem",
            color: "rgba(230,251,255,0.6)", lineHeight: 1.6 }}>
            We&apos;d love to give you a free 15-minute call with one of our brokers to walk through your options.
          </p>
          <a href={CALENDLY_URL} target="_blank" rel="noreferrer" onClick={() => trackSchedule("next_home")}
            className="block w-full rounded-xl py-3.5 text-base font-bold text-center"
            style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18",
              fontFamily: "var(--font-dm-sans)" }}>
            Book a Free Call {"\u2192"}
          </a>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(4,30,58,0.97)", border: "1.5px solid rgba(245,158,11,0.5)",
            boxShadow: "0 0 60px -12px rgba(245,158,11,0.4)" }}>
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(245,158,11,0.18)" }}>
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.45rem",
              color: "#fbbf24", letterSpacing: "0.04em", lineHeight: 1.15 }}>
              Your Next Property Accelerator {"\u2014"} $27
            </p>
            <p className="mt-1" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem",
              color: "rgba(245,158,11,0.6)" }}>
              Everything you need to make your next move
            </p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {[
              `Your personalised roadmap based on your income of ${formatCurrency(quiz.annualIncome ?? 0)}`,
              `Custom equity & borrowing tracker`,
              `Step-by-step strategy for your next purchase`,
              `Priority broker callback`,
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem",
                  color: "#fbbf24", fontWeight: 700, lineHeight: 1.5, flexShrink: 0 }}>{"\u2713"}</span>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem",
                  color: "rgba(230,251,255,0.75)", lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5">
            <a href={STRIPE_URL} target="_blank" rel="noreferrer" onClick={() => trackInitiateCheckout()}
              className="block w-full rounded-xl py-4 text-base font-bold text-center"
              style={{ background: "linear-gradient(135deg,#92400e,#d97706,#fbbf24)",
                color: "#020B18", fontFamily: "var(--font-dm-sans)",
                boxShadow: "0 0 28px -6px rgba(245,158,11,0.55)" }}>
              Get My Custom Plan {"\u2014"} $27
            </a>
            <div className="mt-3 flex items-center justify-center gap-4">
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.35)" }}>
                {"\u26a1"} Instant delivery
              </p>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.35)" }}>
                {"\u2713"} 30-day money-back
              </p>
            </div>
          </div>
        </div>
      )}
    </ResultsPopup>
    </>
  );
}
