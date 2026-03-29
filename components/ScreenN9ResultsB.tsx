"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import type { QuizData, AustralianState } from "@/lib/types";
import {
  calculatePathN,
  computeAdditionalBorrowingN,
  formatCurrency,
  pmt,
  pmtN,
  calculateLMI,
  MARKET_RATE,
} from "@/lib/calculations";
import { calculateStampDuty } from "@/lib/stamp-duty";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props { quiz: QuizData; }

interface PriceBD {
  price:                  number;
  reqDeposit:             number;
  depositPct:             number;
  newLoan:                number;
  lmi:                    number;
  totalNewLoan:           number;
  newLvr:                 number;
  stampDuty:              number;
  cashBuffer:             number;  // real cash remaining (NOT unused equity)
  monthlyRepayNew:        number;
  monthlyRepayExisting:   number;  // on (originalBalance + equityDrawn), 25yr
  equityUsed:             number;  // total equity drawn (deposit + costs covered by equity)
  cashUsed:               number;  // total cash spent (anything not covered by equity)
  loanExceedsCapacity:    boolean;
}

type BannerVariant = "green" | "teal" | "amber" | "red";

interface BannerN {
  variant: BannerVariant;
  icon:    string;
  title:   string;
  detail:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snap(v: number, s: number) { return Math.round(v / s) * s; }

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

// ─── Constants ────────────────────────────────────────────────────────────────

const CONV      = 2_800;
const STEP      = 25_000;
const SLIDER_MIN = 200_000;

// ─── computeAtPriceN ─────────────────────────────────────────────────────────

function computeAtPriceN(
  price:               number,
  usableEquity:        number,
  cashSavings:         number,
  additionalBorrowing: number,
  totalLoanBalance:    number,
  state:               AustralianState,
  isInvestment:        boolean,
): PriceBD {
  const { payable: stampDuty } = calculateStampDuty(state, price, false, false);
  const minDepPct      = isInvestment ? 0.10 : 0.05;
  const minDepFromPct  = Math.round(price * minDepPct);
  const minForCapacity = Math.max(0, price - additionalBorrowing);
  const reqDeposit     = Math.max(minDepFromPct, minForCapacity);

  // Equity is drawn first to cover deposit + buying costs; cash covers any remainder.
  // This is the real money flow: equity drawdown can fund anything.
  const totalRequired = reqDeposit + stampDuty + CONV;
  const equityUsed    = Math.min(usableEquity, totalRequired);  // total equity drawn
  const cashUsed      = Math.max(0, totalRequired - usableEquity);
  // Cash buffer = real cash savings left after cash costs are paid.
  // Unused equity is NOT a cash buffer — it sits in the property until drawn.
  const cashBuffer    = cashSavings - cashUsed;

  const newLoan      = price - reqDeposit;
  const lmi          = Math.round(calculateLMI(newLoan, price));
  const totalNewLoan = newLoan + lmi;
  const newLvr       = price > 0 ? Math.round((newLoan / price) * 1000) / 10 : 0;
  const depositPct   = price > 0 ? reqDeposit / price : 0;

  // Equity drawn increases the existing loan — compute new repayment on increased balance
  const monthlyRepayExisting = Math.round(pmtN(MARKET_RATE, totalLoanBalance + equityUsed, 25 * 12));

  return {
    price,
    reqDeposit,
    depositPct,
    newLoan,
    lmi,
    totalNewLoan,
    newLvr,
    stampDuty,
    cashBuffer,
    monthlyRepayNew: Math.round(pmt(MARKET_RATE, totalNewLoan)),
    monthlyRepayExisting,
    equityUsed,
    cashUsed,
    loanExceedsCapacity: newLoan > additionalBorrowing,
  };
}

// ─── findMaxAffordablePrice ───────────────────────────────────────────────────
// Binary search for the highest snapped price (steps of STEP from SLIDER_MIN)
// where cashBuffer >= 0. Upper bound: SLIDER_MIN + 200 steps = $5.2M.

function findMaxAffordablePrice(
  usableEquity:     number,
  cashSavings:      number,
  totalLoanBalance: number,
  getAdditional:    (price: number) => number,
  state:            AustralianState,
  isInvestment:     boolean,
): number {
  let lo = 0;
  let hi = 200; // steps above SLIDER_MIN

  while (lo < hi) {
    const mid   = Math.floor((lo + hi + 1) / 2);
    const price = SLIDER_MIN + mid * STEP;
    const add   = getAdditional(price);
    const bd    = computeAtPriceN(price, usableEquity, cashSavings, add, totalLoanBalance, state, isInvestment);
    if (bd.cashBuffer >= 0) lo = mid;
    else hi = mid - 1;
  }

  return SLIDER_MIN + lo * STEP;
}

// ─── getBannerN ──────────────────────────────────────────────────────────────

function getBannerN(bd: PriceBD, maxAffordablePrice: number): BannerN {
  if (bd.cashBuffer < 0 || bd.loanExceedsCapacity) {
    return {
      variant: "red",
      icon: "⛔",
      title: "Beyond current capacity at this price",
      detail: bd.cashBuffer < 0
        ? `You'd need an extra ${formatCurrency(Math.abs(bd.cashBuffer))} to cover costs here.`
        : "This price exceeds your additional borrowing capacity.",
    };
  }
  const pct = bd.price / maxAffordablePrice;
  if (pct < 0.5) return {
    variant: "green",
    icon: "✓",
    title: "Strong position — conservative leverage",
    detail: "Low risk entry — significant buffer between your property and full capacity.",
  };
  if (pct < 0.80) return {
    variant: "teal",
    icon: "✓",
    title: "Comfortable — good balance of growth and safety",
    detail: "Well within your capacity with room to absorb rate movements.",
  };
  return {
    variant: "amber",
    icon: "⚠",
    title: "Approaching maximum leverage",
    detail: "Consider speaking with a broker about managing risk at this level.",
  };
}

// ─── Banner colours ───────────────────────────────────────────────────────────

const BANNER_COLORS: Record<BannerVariant, { bg: string; border: string; icon: string; title: string }> = {
  green: {
    bg:     "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.30)",
    icon:   "#22c55e",
    title:  "#86efac",
  },
  teal: {
    bg:     "rgba(0,194,255,0.08)",
    border: "rgba(0,194,255,0.28)",
    icon:   "#00C2FF",
    title:  "#7ffbff",
  },
  amber: {
    bg:     "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.30)",
    icon:   "#f59e0b",
    title:  "#fcd34d",
  },
  red: {
    bg:     "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.30)",
    icon:   "#ef4444",
    title:  "#fca5a5",
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScreenN9ResultsB({ quiz }: Props) {
  const results = useMemo(() => calculatePathN(quiz), [quiz]);
  const {
    totalEquity,
    usableEquity,
    additionalBorrowing,
    existingMonthlyRepay,
    isOverleveraged,
  } = results;

  const cashSavings       = quiz.cashSavings        ?? 0;
  const monthlyRental     = quiz.monthlyRentalIncome ?? 0;
  const totalLoanBalance  = quiz.totalLoanBalance    ?? 0;
  const isInvestment      = quiz.nextPropertyGoal === "investment";
  const state             = (quiz.state ?? quiz.targetState ?? "QLD") as AustralianState;

  // ── Max affordable price (accounts for stamp duty + buying costs) ──────────
  const maxAffordablePrice = useMemo(() => {
    const getAdditional = isInvestment
      ? (p: number) => computeAdditionalBorrowingN(quiz, p * 0.04 / 12)
      : () => additionalBorrowing;
    return findMaxAffordablePrice(usableEquity, cashSavings, totalLoanBalance, getAdditional, state, isInvestment);
  }, [usableEquity, cashSavings, totalLoanBalance, additionalBorrowing, state, isInvestment, quiz]);

  // ── Staggered count-ups ────────────────────────────────────────────────────
  const [t1, setT1] = useState(0);
  const [t2, setT2] = useState(0);
  const [t3, setT3] = useState(0);

  useEffect(() => {
    setT1(totalEquity);
    const id2 = setTimeout(() => setT2(additionalBorrowing), 700);
    const id3 = setTimeout(() => setT3(maxAffordablePrice),  1400);
    return () => { clearTimeout(id2); clearTimeout(id3); };
  }, [totalEquity, additionalBorrowing, maxAffordablePrice]);

  const c1 = useCountUp(t1, 1200);
  const c2 = useCountUp(t2, 1200);
  const c3 = useCountUp(t3, 1600);

  // ── Slider ────────────────────────────────────────────────────────────────
  const SLIDER_MAX     = Math.max(SLIDER_MIN + 50_000, maxAffordablePrice);
  const [selectedPrice, setSelectedPrice] = useState(() => snap(maxAffordablePrice * 0.80, STEP));

  // ── Dynamic additional borrowing (investment: increases as price rises) ───
  const dynamicAdditionalBorrowing = useMemo(() => {
    if (!isInvestment) return additionalBorrowing;
    return computeAdditionalBorrowingN(quiz, selectedPrice * 0.04 / 12);
  }, [isInvestment, additionalBorrowing, quiz, selectedPrice]);

  const bd = useMemo(
    () => computeAtPriceN(selectedPrice, usableEquity, cashSavings, dynamicAdditionalBorrowing, totalLoanBalance, state, isInvestment),
    [selectedPrice, usableEquity, cashSavings, dynamicAdditionalBorrowing, totalLoanBalance, state, isInvestment],
  );

  const banner = useMemo(() => getBannerN(bd, maxAffordablePrice), [bd, maxAffordablePrice]);
  const bc     = BANNER_COLORS[banner.variant];

  // Tweened breakdown values
  const tReqDeposit           = useTween(bd.reqDeposit);
  const tNewLoan              = useTween(bd.newLoan);
  const tLmi                  = useTween(bd.lmi);
  const tTotalNewLoan         = useTween(bd.totalNewLoan);
  const tMonthlyRepay         = useTween(bd.monthlyRepayNew);
  const tMonthlyRepayExisting = useTween(bd.monthlyRepayExisting);
  const tStampDuty            = useTween(bd.stampDuty);
  const tCashBuffer           = useTween(bd.cashBuffer);
  const tEquityUsed           = useTween(bd.equityUsed);
  const tCashUsed             = useTween(bd.cashUsed);

  // ── Share ──────────────────────────────────────────────────────────────────
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

  // Slider pct for visual track
  const sliderPct = ((selectedPrice - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  // Investment calcs (all update as slider moves)
  const annualRent      = selectedPrice * 0.04;
  const weeklyRent      = annualRent / 52;
  const estNewRentMonth = Math.round(annualRent / 12);
  const annualLoanCost  = bd.monthlyRepayNew * 12;
  const netAnnual       = annualRent - annualLoanCost;
  const netWeekly       = netAnnual / 52;

  // True total: existing loan increased by equity draw + new property loan
  const totalMonthly = tMonthlyRepayExisting + tMonthlyRepay;
  const netMonthly   = totalMonthly - monthlyRental;

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    fontFamily: "var(--font-dm-sans)",
    fontSize: "0.82rem",
    color: "rgba(230,251,255,0.7)",
  };
  const rowValStyle: React.CSSProperties = {
    fontFamily: "var(--font-bebas-neue)",
    fontSize: "1rem",
    color: "#e6fbff",
    letterSpacing: "0.03em",
  };
  const sectionHead: React.CSSProperties = {
    fontFamily: "var(--font-bebas-neue)",
    fontSize: "0.75rem",
    letterSpacing: "0.12em",
    color: "rgba(0,194,255,0.5)",
    textTransform: "uppercase" as const,
    marginTop: 14,
    marginBottom: 6,
  };
  const divider: React.CSSProperties = {
    height: 1,
    background: "rgba(10,61,107,0.5)",
    margin: "10px 0",
  };

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden"
      style={{ background: "#020B18" }}
    >
      <BlobBackground intensity={0.15} />

      {/* Scrollable content */}
      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-4 pb-16 pt-8">

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <motion.div
          className="mb-6 text-center"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1rem", letterSpacing: "0.18em", color: "rgba(0,194,255,0.6)", textTransform: "uppercase" }}>
            Your Next Property Report
          </p>
        </motion.div>

        {/* Overleveraged warning */}
        <AnimatePresence>
          {isOverleveraged && (
            <motion.div
              className="mb-4 rounded-2xl px-4 py-3"
              style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)" }}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "#fcd34d" }}>
                ⚠ Your properties may be overleveraged — total debt exceeds total value. Your broker can help you map a path forward.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Count-up stats */}
        <div className="mb-6 flex flex-col gap-3">
          {[
            { label: "Total equity", value: c1, delay: 0 },
            { label: "Additional borrowing power", value: c2, delay: 0.1 },
          ].map(({ label, value, delay }) => (
            <motion.div
              key={label}
              className="rounded-2xl px-4 py-3"
              style={{ background: "rgba(4,30,58,0.6)", border: "1px solid rgba(10,61,107,0.6)" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay, duration: 0.4 }}
            >
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", color: "rgba(230,251,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {label}
              </p>
              <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#00C2FF", textShadow: "0 0 24px rgba(0,194,255,0.35)", letterSpacing: "0.03em", lineHeight: 1.1 }}>
                {formatCurrency(value)}
              </p>
            </motion.div>
          ))}

          {/* Budget — bigger */}
          <motion.div
            className="rounded-2xl px-4 py-4"
            style={{ background: "rgba(0,194,255,0.07)", border: "2px solid rgba(0,194,255,0.3)", boxShadow: "0 0 48px -12px rgba(0,194,255,0.3)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", color: "rgba(0,194,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Your next property budget
            </p>
            <p style={{
              fontFamily: "var(--font-bebas-neue)",
              fontSize: "clamp(2.4rem,11vw,3.6rem)",
              background: "linear-gradient(135deg, #00C2FF, #7ffbff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "none",
              letterSpacing: "0.03em",
              lineHeight: 1,
              filter: "drop-shadow(0 0 20px rgba(0,194,255,0.5))",
            }}>
              {formatCurrency(c3)}
            </p>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem", color: "rgba(230,251,255,0.35)", marginTop: 4 }}>
              After stamp duty &amp; buying costs
            </p>
          </motion.div>
        </div>

        {/* ── SLIDER ──────────────────────────────────────────────────────── */}
        <motion.div
          className="mb-4 rounded-2xl px-4 py-5"
          style={{ background: "rgba(4,30,58,0.7)", border: "1px solid rgba(10,61,107,0.6)" }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem", color: "rgba(230,251,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
            Explore a target price
          </p>
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(2rem,9vw,3rem)", color: "#00C2FF", letterSpacing: "0.03em", lineHeight: 1, textShadow: "0 0 32px rgba(0,194,255,0.4)", marginBottom: 12 }}>
            {formatCurrency(selectedPrice)}
          </p>

          {/* Custom slider */}
          <div className="relative mx-1 flex h-12 items-center">
            <div className="absolute inset-x-0 rounded-full" style={{ height: 6, background: "rgba(10,61,107,0.55)" }} />
            <div className="absolute left-0 rounded-full" style={{ height: 6, width: `${sliderPct}%`, background: "linear-gradient(to right,#0076BE,#00C2FF)" }} />
            <div
              className="pointer-events-none absolute -translate-x-1/2 rounded-full"
              style={{ left: `${sliderPct}%`, width: 44, height: 44, background: "#00C2FF", boxShadow: "0 0 20px 6px rgba(0,194,255,0.45)", border: "3px solid rgba(255,255,255,0.3)" }}
            />
            <input
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={STEP}
              value={selectedPrice}
              onChange={e => setSelectedPrice(Number(e.target.value))}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
              style={{ height: "100%", touchAction: "none" }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs" style={{ color: "rgba(230,251,255,0.25)", fontFamily: "var(--font-dm-sans)" }}>
            <span>$200k</span>
            <span>Max: {formatCurrency(SLIDER_MAX)}</span>
          </div>
        </motion.div>

        {/* ── CONTEXT BANNER ──────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={banner.variant + banner.title}
            className="mb-4 flex items-start gap-3 rounded-2xl px-4 py-3"
            style={{ background: bc.bg, border: `1px solid ${bc.border}` }}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
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
        <motion.div
          className="mb-4 rounded-2xl px-4 py-4"
          style={{ background: "rgba(4,30,58,0.65)", border: "1px solid rgba(10,61,107,0.6)" }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        >
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "0.85rem", letterSpacing: "0.1em", color: "rgba(230,251,255,0.4)", textTransform: "uppercase", marginBottom: 8 }}>
            Live Breakdown
          </p>

          {/* New property */}
          <div style={rowStyle}>
            <span>Next property price</span>
            <span style={rowValStyle}>{formatCurrency(selectedPrice)}</span>
          </div>
          <div style={rowStyle}>
            <span>Deposit</span>
            <span style={rowValStyle}>{formatCurrency(tReqDeposit)} ({Math.round(bd.depositPct * 100)}%)</span>
          </div>
          <div style={rowStyle}>
            <span>New loan amount{tLmi > 0 ? " (incl. LMI)" : ""}</span>
            <span style={rowValStyle}>{formatCurrency(tLmi > 0 ? tTotalNewLoan : tNewLoan)}</span>
          </div>
          <div style={rowStyle}>
            <span>Est. monthly repayment</span>
            <span style={{ ...rowValStyle, color: "#00C2FF" }}>{formatCurrency(tMonthlyRepay)}/mo at 6.2%, 30yr</span>
          </div>

          <div style={divider} />

          {/* Combined position */}
          <p style={sectionHead}>Combined Position</p>
          <div>
            <div style={rowStyle}>
              <span>Existing loan (after equity draw)</span>
              <span style={rowValStyle}>{formatCurrency(tMonthlyRepayExisting)}/mo</span>
            </div>
            {tEquityUsed > 0 && (
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem", color: "rgba(230,251,255,0.3)", marginTop: -2, marginBottom: 4 }}>
                Was {formatCurrency(existingMonthlyRepay)}/mo before equity draw
              </p>
            )}
          </div>
          <div style={rowStyle}>
            <span>New property repayment</span>
            <span style={rowValStyle}>{formatCurrency(tMonthlyRepay)}/mo</span>
          </div>
          <div style={{ ...rowStyle, fontWeight: 600, color: "#e6fbff" }}>
            <span>True total monthly repayments</span>
            <span style={{ ...rowValStyle, fontSize: "1.1rem" }}>{formatCurrency(totalMonthly)}/mo</span>
          </div>

          {monthlyRental > 0 && (
            <>
              <div style={rowStyle}>
                <span>Rental income (existing props.)</span>
                <span style={{ ...rowValStyle, color: "#22c55e" }}>+{formatCurrency(monthlyRental)}/mo</span>
              </div>
              <div style={{ ...rowStyle, fontWeight: 600, color: "#e6fbff" }}>
                <span>Net monthly cost</span>
                <span style={{ ...rowValStyle, fontSize: "1.1rem", color: netMonthly < 0 ? "#22c55e" : "#e6fbff" }}>
                  {netMonthly < 0 ? "+" : ""}{formatCurrency(Math.abs(netMonthly))}/mo
                </span>
              </div>
            </>
          )}

          {isInvestment && (
            <div style={rowStyle}>
              <span>Est. rent on new property (4% yield)</span>
              <span style={{ ...rowValStyle, color: "#22c55e" }}>+{formatCurrency(estNewRentMonth)}/mo</span>
            </div>
          )}

          <div style={divider} />

          {/* Funds breakdown */}
          <p style={sectionHead}>Where Your Funds Go</p>
          <div>
            <div style={rowStyle}>
              <span>From equity access</span>
              <span style={rowValStyle}>{formatCurrency(tEquityUsed)}</span>
            </div>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem", color: "rgba(230,251,255,0.3)", marginTop: -2, marginBottom: 4 }}>
              Borrowed against your existing property — increases your current loan repayments
            </p>
          </div>
          <div style={rowStyle}>
            <span>From cash savings</span>
            <span style={rowValStyle}>{formatCurrency(tCashUsed)}</span>
          </div>
          <div style={rowStyle}>
            <span>Stamp duty</span>
            {tStampDuty > 0
              ? <span style={{ ...rowValStyle, color: "#f59e0b" }}>−{formatCurrency(tStampDuty)}</span>
              : <span style={{ ...rowValStyle, color: "#22c55e" }}>$0 WAIVED</span>
            }
          </div>
          <div style={rowStyle}>
            <span>Conveyancing + inspections</span>
            <span style={{ ...rowValStyle, color: "#f59e0b" }}>−{formatCurrency(CONV)}</span>
          </div>

          {/* LMI card */}
          <div
            className="my-2 rounded-xl px-3 py-2"
            style={{
              background: tLmi > 0 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)",
              border: `1px solid ${tLmi > 0 ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`,
            }}
          >
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", color: tLmi > 0 ? "#fcd34d" : "#86efac" }}>
              {tLmi > 0
                ? `LMI: ${formatCurrency(tLmi)} — added to your loan, not your upfront costs`
                : "LMI: $0 — not required ✓"}
            </p>
          </div>

          {/* Cash buffer */}
          <div style={{ ...rowStyle, marginTop: 4 }}>
            <span style={{ color: tCashBuffer >= 0 ? "rgba(230,251,255,0.7)" : "#fca5a5" }}>
              {tCashBuffer >= 0 ? "Cash savings remaining" : "Cash shortfall"}
            </span>
            <span style={{
              fontFamily: "var(--font-bebas-neue)",
              fontSize: tCashBuffer >= 0 ? "1.3rem" : "1.1rem",
              color: tCashBuffer >= 0 ? "#22c55e" : "#ef4444",
              textShadow: tCashBuffer >= 0 ? "0 0 20px rgba(34,197,94,0.45)" : "none",
            }}>
              {tCashBuffer >= 0 ? "+" : "−"}{formatCurrency(Math.abs(tCashBuffer))}
            </span>
          </div>
        </motion.div>

        {/* ── INVESTMENT SECTION ──────────────────────────────────────────── */}
        {isInvestment && (
          <motion.div
            className="mb-4 rounded-2xl px-4 py-4"
            style={{ background: "rgba(4,30,58,0.65)", border: "1px solid rgba(10,61,107,0.6)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          >
            <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "0.85rem", letterSpacing: "0.1em", color: "rgba(230,251,255,0.4)", textTransform: "uppercase", marginBottom: 8 }}>
              Investment Analysis
            </p>
            <div style={rowStyle}>
              <span>Estimated rent on new property</span>
              <span style={{ ...rowValStyle, color: "#22c55e" }}>{formatCurrency(weeklyRent)}/wk</span>
            </div>
            <div style={rowStyle}>
              <span>Annual rental income</span>
              <span style={rowValStyle}>{formatCurrency(annualRent)}</span>
            </div>
            <div style={rowStyle}>
              <span>Annual loan cost</span>
              <span style={rowValStyle}>{formatCurrency(annualLoanCost)}</span>
            </div>
            <div style={divider} />
            <div
              className="rounded-xl px-3 py-2"
              style={{
                background: netAnnual >= 0 ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${netAnnual >= 0 ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
              }}
            >
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem", color: netAnnual >= 0 ? "#86efac" : "#fcd34d", lineHeight: 1.5 }}>
                {netAnnual >= 0
                  ? `This property could generate ${formatCurrency(Math.abs(netWeekly))}/week net income after loan costs.`
                  : `This property would cost you approximately ${formatCurrency(Math.abs(netWeekly))}/week after loan repayments. This is common and may provide tax benefits — your broker can explain.`}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <motion.div
          className="mb-4 rounded-2xl px-4 py-5"
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "2px solid rgba(34,197,94,0.35)",
            boxShadow: "0 0 40px -12px rgba(34,197,94,0.35)",
          }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        >
          <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.3rem", color: "#86efac", letterSpacing: "0.05em", marginBottom: 6 }}>
            ✓ You&apos;re Ready for Your Next Property
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem", color: "rgba(230,251,255,0.6)", lineHeight: 1.5, marginBottom: 16 }}>
            {isInvestment
              ? "Get a free strategy session — your broker will cover loan structuring, tax implications, and portfolio strategy."
              : "Get a free strategy session on your next purchase — we'll map out the best structure for your situation."}
          </p>
          <motion.button
            type="button"
            className="w-full rounded-2xl py-4 text-base font-semibold"
            style={{
              background: "linear-gradient(135deg,#166534,#22c55e)",
              color: "#fff",
              fontFamily: "var(--font-dm-sans)",
              boxShadow: "0 0 32px -8px rgba(34,197,94,0.6)",
            }}
            whileTap={{ scale: 0.97 }}
          >
            Book a Free Call →
          </motion.button>
        </motion.div>

        {/* Share */}
        <motion.button
          type="button"
          onClick={handleShare}
          className="mb-4 w-full rounded-2xl py-3 text-sm"
          style={{
            background: "rgba(4,30,58,0.6)",
            border: "1px solid rgba(10,61,107,0.6)",
            color: "rgba(230,251,255,0.5)",
            fontFamily: "var(--font-dm-sans)",
          }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >
          {copied ? "Copied! ✓" : "Share my result ↗"}
        </motion.button>

        {/* Disclaimer */}
        <p
          className="text-center text-xs leading-relaxed"
          style={{ color: "rgba(230,251,255,0.2)", fontFamily: "var(--font-dm-sans)" }}
        >
          This is an estimate only, based on the information you provided. Actual borrowing capacity and costs may differ. Speak with a licensed mortgage broker before making any financial decisions.
        </p>
      </div>
    </div>
  );
}
