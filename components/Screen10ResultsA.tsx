"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import type { QuizData, AustralianState } from "@/lib/types";
import { calculatePathA, formatCurrency, pmt, calculateLMI, MARKET_RATE } from "@/lib/calculations";
import { calculateStampDuty } from "@/lib/stamp-duty";
import {
  FHG_PRICE_CAPS, FHG_INCOME_SINGLE, FHG_INCOME_COUPLE,
  FAM_HG_INCOME_CAP, FHOG_AMOUNTS,
} from "@/lib/grants";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONV      = 2_800;   // conveyancing + inspections
const STEP      = 5_000;
const SLIDER_MIN = 200_000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props { quiz: QuizData; }

interface PriceBreakdown {
  price:               number;
  propertyDeposit:     number;  // cash put toward property
  depositPct:          number;  // propertyDeposit / price
  baseLoan:            number;  // before LMI capitalisation
  lmi:                 number;  // added to loan — NEVER from savings
  totalLoan:           number;  // baseLoan + lmi
  lvr:                 number;
  stampDuty:           number;
  stampDutySaved:      number;
  cashBuffer:          number;  // savings left after all cash costs (positive = kept, negative = shortfall)
  monthlyRepayment:    number;  // on totalLoan at MARKET_RATE
  govContrib:          number;
  schemeGovPct:        number;
  schemeMinDepPct:     number;
  schemeName:          string;
  schemeActive:        boolean;
  loanExceedsCapacity: boolean;
}

interface SchemeCard {
  id:      string;
  name:    string;
  what:    string;
  benefit: string;
  capNote: string;
  status:  "active" | "available" | "not-eligible";
}

type BannerVariant = "green" | "amber" | "blue" | "orange" | "red";

interface BannerInfo {
  variant: BannerVariant;
  icon:    string;
  title:   string;
  detail:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function snap(v: number, s: number)               { return Math.round(v / s) * s; }

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
  const [v, setV]       = useState(target);
  const prevRef         = useRef(target);
  const startRef        = useRef(0);
  const rafRef          = useRef(0);
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

// ─── Core per-price calculation ───────────────────────────────────────────────
// CRITICAL: LMI is added to the loan amount — it is NEVER deducted from savings.
// Cash costs = propertyDeposit + stampDuty + CONV only.

function computeAtPrice(
  price:          number,
  deposit:        number,
  capacity:       number,
  grossIncome:    number,
  state:          AustralianState,
  isCouple:       boolean,
  isSingleParent: boolean,
  isNewBuild:     boolean,
): PriceBreakdown {
  const schemeCap = FHG_PRICE_CAPS[state];

  // Family Home Guarantee (single parents, 2% min deposit) takes priority over FHG
  const qualFam = isSingleParent && grossIncome <= FAM_HG_INCOME_CAP;
  const qualFHG = !isSingleParent && grossIncome <= (isCouple ? FHG_INCOME_COUPLE : FHG_INCOME_SINGLE);
  const schemeActive = price <= schemeCap && (qualFam || qualFHG);

  let schemeName   = "";
  let schemeMinDep = 0;
  const schemeGovPct = 0; // no co-ownership schemes — LMI waived only
  if (schemeActive) {
    if (qualFam) { schemeName = "Family Home Guarantee"; schemeMinDep = 0.02; }
    else         { schemeName = "First Home Guarantee";  schemeMinDep = 0.05; }
  }

  const { payable: stampDuty, concession: stampDutySaved } =
    calculateStampDuty(state, price, true, isNewBuild);

  // Available savings after non-deposit cash costs (same for both paths).
  const availForDeposit = deposit - stampDuty - CONV;

  if (schemeActive) {
    const govContrib = Math.round(price * schemeGovPct);
    // Minimum deposit = higher of scheme floor OR amount needed to keep loan ≤ capacity.
    // This means at higher prices the deposit rises naturally rather than locking at 5%.
    const minFromScheme  = Math.round(price * schemeMinDep);
    const minForCapacity = Math.max(0, price - govContrib - capacity);
    const reqDeposit     = Math.max(minFromScheme, minForCapacity);
    const baseLoan       = Math.max(0, price - govContrib - reqDeposit);
    const lmi            = 0; // waived by guarantee scheme
    const totalLoan      = baseLoan;
    const lvr            = price > 0 ? Math.round((baseLoan / price) * 1000) / 10 : 0;
    const depositPct     = price > 0 ? reqDeposit / price : 0;
    const cashBuffer     = availForDeposit - reqDeposit;
    return {
      price, propertyDeposit: reqDeposit, depositPct,
      baseLoan, lmi, totalLoan, lvr, stampDuty, stampDutySaved,
      cashBuffer, monthlyRepayment: Math.round(pmt(MARKET_RATE, totalLoan)),
      govContrib, schemeGovPct, schemeMinDepPct: schemeMinDep,
      schemeName, schemeActive: true,
      loanExceedsCapacity: baseLoan > capacity,
    };
  }

  // No scheme — deposit = max(5% floor, amount needed so loan ≤ capacity).
  // Buyer keeps the rest as cash buffer; at max price cashBuffer hits $0.
  const minDep5pct       = Math.round(price * 0.05);
  const minForCapacity   = Math.max(0, price - capacity);
  const reqDeposit       = Math.max(minDep5pct, minForCapacity);
  const cashBuffer       = availForDeposit - reqDeposit;

  const baseLoan   = price - reqDeposit;
  const lmi        = Math.round(calculateLMI(baseLoan, price)); // capitalised into loan
  const totalLoan  = baseLoan + lmi;
  const lvr        = price > 0 ? Math.round((baseLoan / price) * 1000) / 10 : 0;
  const depositPct = price > 0 ? reqDeposit / price : 0;

  return {
    price, propertyDeposit: reqDeposit, depositPct,
    baseLoan, lmi, totalLoan, lvr, stampDuty, stampDutySaved,
    cashBuffer, monthlyRepayment: Math.round(pmt(MARKET_RATE, totalLoan)),
    govContrib: 0, schemeGovPct: 0, schemeMinDepPct: 0,
    schemeName: "", schemeActive: false,
    loanExceedsCapacity: baseLoan > capacity,
  };
}

// ─── Smart default ─────────────────────────────────────────────────────────────

type Scenario = "scheme" | "full-power" | "sweet-spot" | "low-savings";

interface SmartDefault {
  price:    number;
  scenario: Scenario;
  reco:     string;
  bd:       PriceBreakdown;
}

function getSmartDefault(
  capacity:       number,
  deposit:        number,
  grossIncome:    number,
  state:          AustralianState,
  isCouple:       boolean,
  isSingleParent: boolean,
  isNewBuild:     boolean,
  incomeQualAny:  boolean,
  schemeCap:      number,
  SLIDER_MAX:     number,
): SmartDefault {
  function test(price: number): PriceBreakdown {
    return computeAtPrice(price, deposit, capacity, grossIncome, state, isCouple, isSingleParent, isNewBuild);
  }
  function viable(bd: PriceBreakdown): boolean {
    return !bd.loanExceedsCapacity && bd.cashBuffer >= 0;
  }

  // ── Scenario A: scheme at max feasible price ──
  let scenarioA_price = 0;
  if (incomeQualAny) {
    // Family Home Guarantee: 2% min deposit; First Home Guarantee: 5% min deposit
    // No co-ownership schemes — govPct always 0
    const schemeMinDep = (isSingleParent && grossIncome <= FAM_HG_INCOME_CAP) ? 0.02 : 0.05;
    const govFactor = 1 - schemeMinDep;
    const maxByCapacity = govFactor > 0 ? snap(capacity / govFactor, STEP) : schemeCap;
    const candidateA = clamp(snap(Math.min(schemeCap, maxByCapacity), STEP), SLIDER_MIN, SLIDER_MAX);
    const bdA = test(candidateA);
    if (bdA.schemeActive && viable(bdA)) scenarioA_price = candidateA;
  }

  // ── Scenario B: full power (borrow to capacity, use all savings as deposit) ──
  const approxAvail  = Math.max(0, deposit - CONV); // approximate (SD often $0 for FHB)
  const scenarioB_price = clamp(snap(capacity + approxAvail, STEP), SLIDER_MIN, SLIDER_MAX);
  const bdB = test(scenarioB_price);

  // ── Scenario C: sweet spot 80% LVR ──
  // LVR = baseLoan/price = 0.80, baseLoan = capacity → price = capacity/0.80
  const sweetRaw = snap(capacity / 0.80, STEP);
  const scenarioC_price = clamp(sweetRaw, SLIDER_MIN, SLIDER_MAX);
  const bdC = test(scenarioC_price);
  const scenarioC_valid = viable(bdC) && bdC.lmi === 0;

  // ── Low savings: can't afford even slider min ──
  const bdMin = test(SLIDER_MIN);
  if (!viable(bdMin)) {
    const minSD = calculateStampDuty(state, SLIDER_MIN, true, isNewBuild).payable;
    const minCashNeeded = Math.round(SLIDER_MIN * 0.05) + minSD + CONV;
    const shortfall = Math.max(0, minCashNeeded - deposit);
    return {
      price: SLIDER_MIN, scenario: "low-savings",
      reco: `Right now your savings of ${formatCurrency(deposit)} aren't quite enough to cover upfront buying costs. You need an additional ${formatCurrency(shortfall)} to reach the minimum at ${formatCurrency(SLIDER_MIN)}.`,
      bd: bdMin,
    };
  }

  // ── Pick winner ──
  interface Candidate { price: number; scenario: Scenario; bd: PriceBreakdown; }
  const candidates: Candidate[] = [];
  if (scenarioA_price > 0) candidates.push({ price: scenarioA_price, scenario: "scheme",      bd: test(scenarioA_price) });
  if (viable(bdB))         candidates.push({ price: scenarioB_price, scenario: "full-power",  bd: bdB });
  if (scenarioC_valid)     candidates.push({ price: scenarioC_price, scenario: "sweet-spot",  bd: bdC });

  // Prefer scheme when its cashBuffer beats others, otherwise pick highest price
  let winner: Candidate | undefined;
  const scheme     = candidates.find(c => c.scenario === "scheme");
  const noScheme   = [...candidates].filter(c => c.scenario !== "scheme").sort((a, b) => b.price - a.price)[0];

  if (scheme && noScheme) {
    // Scheme wins if buffer is materially better OR price is comparable
    const bufferBetter = scheme.bd.cashBuffer > noScheme.bd.cashBuffer * 1.3;
    const priceClose   = scheme.price >= noScheme.price * 0.85;
    winner = (bufferBetter || priceClose) ? scheme : noScheme;
  } else {
    winner = scheme ?? noScheme ?? candidates[0];
  }

  // Fallback: binary search highest affordable price
  if (!winner) {
    let lo = SLIDER_MIN, hi = SLIDER_MAX, found = SLIDER_MIN;
    while (lo <= hi) {
      const mid = snap((lo + hi) / 2, STEP);
      if (viable(test(mid))) { found = mid; lo = mid + STEP; } else hi = mid - STEP;
    }
    winner = { price: found, scenario: "full-power", bd: test(found) };
  }

  // ── Generate recommendation text ──
  const { price: wp, scenario: ws, bd: wbd } = winner;
  let reco = "";
  if (ws === "scheme") {
    const depPct = Math.round(wbd.schemeMinDepPct * 100);
    const sdNote = wbd.stampDuty === 0 ? ", $0 stamp duty" : "";
    reco = `Our recommendation: Buy under ${formatCurrency(schemeCap)} using the ${wbd.schemeName}. You pay just ${depPct}% deposit with zero LMI${sdNote} — and you keep ${formatCurrency(wbd.cashBuffer)} in your pocket.`;
  } else if (ws === "full-power") {
    const depPct = wbd.price > 0 ? Math.round((wbd.propertyDeposit / wbd.price) * 100) : 0;
    const lmiNote = wbd.lmi > 0
      ? ` LMI of ${formatCurrency(wbd.lmi)} gets added to your loan — no cash out of pocket for it.`
      : " No LMI at this deposit level.";
    reco = `Your savings put you in a strong position. At ${formatCurrency(wp)} you have a solid ${depPct}% deposit.${lmiNote}`;
  } else if (ws === "sweet-spot") {
    reco = `The sweet spot: at ${formatCurrency(wp)} your deposit hits 20% — zero LMI. You keep ${formatCurrency(wbd.cashBuffer)} as your safety buffer.`;
  }

  return { price: wp, scenario: ws, reco, bd: wbd };
}

// ─── Dynamic context banner ───────────────────────────────────────────────────

function getBanner(
  bd: PriceBreakdown,
  incomeQualAny: boolean,
  schemeCap: number,
): BannerInfo {
  // Red: can't afford
  if (bd.cashBuffer < 0 || bd.loanExceedsCapacity) {
    const shortfall = bd.cashBuffer < 0
      ? `You'd need an additional ${formatCurrency(Math.abs(bd.cashBuffer))} to cover upfront costs at this price.`
      : `This price exceeds your borrowing capacity — lower the price to find your sweet spot.`;
    return { variant: "red", icon: "⛔", title: "Not quite there at this price", detail: shortfall };
  }
  // Green: scheme active
  if (bd.schemeActive) {
    const depPct = Math.round(bd.schemeMinDepPct * 100);
    const sdNote = bd.stampDuty === 0 ? " · $0 stamp duty" : "";
    return {
      variant: "green", icon: "✓",
      title: `${bd.schemeName} active`,
      detail: `${depPct}% minimum deposit · LMI completely waived${sdNote} · You keep ${formatCurrency(bd.cashBuffer)}`,
    };
  }
  // Amber: above scheme cap
  if (incomeQualAny) {
    return {
      variant: "amber", icon: "⚠",
      title: `Government schemes unavailable above ${formatCurrency(schemeCap)}`,
      detail: `Drag below ${formatCurrency(schemeCap)} to unlock — minimum deposit, no LMI.`,
    };
  }
  // Blue: 20%+ deposit, no LMI
  if (bd.lmi === 0) {
    const depPct = bd.price > 0 ? Math.round((bd.propertyDeposit / bd.price) * 100) : 0;
    return {
      variant: "blue", icon: "✓",
      title: `Strong ${depPct}% deposit — no LMI`,
      detail: `Above 20% deposit means LMI is completely avoided. You keep ${formatCurrency(bd.cashBuffer)}.`,
    };
  }
  // Orange: LMI applies (added to loan, not savings)
  return {
    variant: "orange", icon: "⚠",
    title: `LMI of ${formatCurrency(bd.lmi)} added to your loan`,
    detail: `Your deposit is ${Math.round(bd.depositPct * 100)}% — LMI is capitalised into the loan, not taken from your savings. You keep ${formatCurrency(bd.cashBuffer)}.`,
  };
}

// ─── Scheme cards ──────────────────────────────────────────────────────────────

function buildSchemeCards(
  grossIncome:    number,
  selectedPrice:  number,
  state:          AustralianState,
  isCouple:       boolean,
  isSingleParent: boolean,
  isNewBuild:     boolean,
): SchemeCard[] {
  const cap  = FHG_PRICE_CAPS[state];
  const fhog = FHOG_AMOUNTS[state];
  const cards: SchemeCard[] = [];

  if (isSingleParent) {
    const ok = grossIncome <= FAM_HG_INCOME_CAP;
    cards.push({
      id: "fhg-fam", name: "Family Home Guarantee",
      what: "Government guarantees 18% of your loan — single parents buy with just 2% deposit",
      benefit: "2% deposit · LMI completely waived",
      capNote: `Homes under ${formatCurrency(cap)}`,
      status: !ok ? "not-eligible" : selectedPrice <= cap ? "active" : "available",
    });
  } else {
    const ok = grossIncome <= (isCouple ? FHG_INCOME_COUPLE : FHG_INCOME_SINGLE);
    cards.push({
      id: "fhg", name: "First Home Guarantee",
      what: "Government guarantees 15% of your loan — buy with 5% deposit and avoid LMI entirely",
      benefit: "5% deposit · LMI waived · saves $8k–$25k+",
      capNote: `Homes under ${formatCurrency(cap)}`,
      status: !ok ? "not-eligible" : selectedPrice <= cap ? "active" : "available",
    });
  }

  if (fhog.amount > 0) {
    const eligible = isNewBuild && (fhog.maxPrice === 0 || selectedPrice <= fhog.maxPrice);
    cards.push({
      id: "fhog", name: `${state} First Home Owner Grant`,
      what: `${formatCurrency(fhog.amount)} cash grant paid at settlement for new builds`,
      benefit: `${formatCurrency(fhog.amount)} straight into your deposit`,
      capNote: fhog.maxPrice > 0 ? `New builds under ${formatCurrency(fhog.maxPrice)}` : "New builds — no price cap",
      status: eligible ? "active" : "not-eligible",
    });
  }

  cards.push({
    id: "fhss", name: "First Home Super Saver (FHSS)",
    what: "Withdraw voluntary super contributions at a concessional tax rate for your deposit",
    benefit: "Access up to $50,000 from super",
    capNote: "No property price cap",
    status: "available",
  });

  return cards;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const BANNER_STYLES: Record<BannerVariant, { bg: string; border: string; glow?: string; titleColor: string; detailColor: string }> = {
  green:  { bg: "rgba(34,197,94,0.09)",  border: "rgba(34,197,94,0.55)",  glow: "0 0 28px -8px rgba(34,197,94,0.5)",  titleColor: "#22c55e", detailColor: "rgba(34,197,94,0.8)" },
  amber:  { bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.45)", titleColor: "#f59e0b", detailColor: "rgba(245,158,11,0.7)" },
  blue:   { bg: "rgba(0,194,255,0.06)",  border: "rgba(0,194,255,0.4)",   titleColor: "#00C2FF", detailColor: "rgba(0,194,255,0.7)"  },
  orange: { bg: "rgba(251,146,60,0.07)", border: "rgba(251,146,60,0.4)",  titleColor: "#fb923c", detailColor: "rgba(251,146,60,0.7)" },
  red:    { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.5)",   titleColor: "#ef4444", detailColor: "rgba(239,68,68,0.7)"  },
};

function ContextBanner({ info }: { info: BannerInfo }) {
  const s = BANNER_STYLES[info.variant];
  return (
    <div className="rounded-2xl px-4 py-3"
      style={{ background: s.bg, border: `1.5px solid ${s.border}`, boxShadow: s.glow ?? "none" }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: s.titleColor, fontSize: "0.9rem" }}>{info.icon}</span>
        <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.05rem",
          color: s.titleColor, letterSpacing: "0.05em" }}>
          {info.title}
        </p>
      </div>
      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.76rem",
        color: s.detailColor, lineHeight: 1.5 }}>
        {info.detail}
      </p>
    </div>
  );
}

function Row({ label, value, sub, bold, green, red, large }: {
  label: string; value: string; sub?: string;
  bold?: boolean; green?: boolean; red?: boolean; large?: boolean;
}) {
  const color = green ? "#22c55e" : red ? "#ef4444" : bold ? "#e6fbff" : "rgba(230,251,255,0.75)";
  const size  = large ? "1.6rem" : bold ? "1.1rem" : "1rem";
  return (
    <div className="flex items-center justify-between py-2">
      <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem",
        color: bold ? "rgba(230,251,255,0.7)" : "rgba(230,251,255,0.45)", fontWeight: bold ? 600 : 400 }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-bebas-neue)", fontSize: size, color,
        textShadow: (green && large) ? "0 0 20px rgba(34,197,94,0.4)" : "none" }}>
        {value}
        {sub && (
          <span className="ml-2 rounded px-1.5 py-0.5"
            style={{ background: green ? "rgba(34,197,94,0.15)" : "rgba(0,194,255,0.12)",
              color: green ? "#22c55e" : "#00C2FF",
              fontFamily: "var(--font-dm-sans)", fontSize: "0.6rem", fontWeight: 700,
              letterSpacing: "0.05em" }}>
            {sub}
          </span>
        )}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Screen10ResultsA({ quiz }: Props) {
  const results   = useMemo(() => calculatePathA(quiz), [quiz]);
  const { borrowingCapacity: capacity, grossIncome } = results;

  const state          = (quiz.state ?? "QLD") as AustralianState;
  const deposit        = quiz.deposit ?? 0;
  const isCouple       = quiz.buyingSituation === "partner";
  const isSingleParent = quiz.buyingSituation === "single-parent";
  const isNewBuild     = quiz.propertyType === "land";

  const schemeCap = FHG_PRICE_CAPS[state];
  const qualFam   = isSingleParent && grossIncome <= FAM_HG_INCOME_CAP;
  const qualFHG   = !isSingleParent && grossIncome <= (isCouple ? FHG_INCOME_COUPLE : FHG_INCOME_SINGLE);
  const incomeQualAny = qualFam || qualFHG;

  // Max slider = capacity + all savings after min costs
  const SLIDER_MAX = Math.max(SLIDER_MIN + 50_000,
    snap(capacity + Math.max(0, deposit - CONV), STEP));

  // Smart default — runs once
  const smartDefault = useMemo(() =>
    getSmartDefault(capacity, deposit, grossIncome, state, isCouple, isSingleParent, isNewBuild,
      incomeQualAny, schemeCap, SLIDER_MAX),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const [selectedPrice, setSelectedPrice] = useState(smartDefault.price);
  const [hasDragged, setHasDragged]       = useState(false);

  const bd = useMemo(() =>
    computeAtPrice(selectedPrice, deposit, capacity, grossIncome, state, isCouple, isSingleParent, isNewBuild),
    [selectedPrice, deposit, capacity, grossIncome, state, isCouple, isSingleParent, isNewBuild],
  );

  const schemeCards = useMemo(() =>
    buildSchemeCards(grossIncome, selectedPrice, state, isCouple, isSingleParent, isNewBuild),
    [grossIncome, selectedPrice, state, isCouple, isSingleParent, isNewBuild],
  );

  // Tweened values for smooth breakdown animation
  const tweenCash       = useTween(bd.cashBuffer);
  const tweenRepayment  = useTween(bd.monthlyRepayment);
  const tweenTotalLoan  = useTween(bd.totalLoan);
  const tweenLMI        = useTween(bd.lmi);
  const tweenDeposit    = useTween(bd.propertyDeposit);
  const tweenStampDuty  = useTween(bd.stampDuty);

  // Hero count-up
  const heroCount = useCountUp(capacity, 1800);

  // Slider geometry
  const pricePct = Math.max(0, Math.min(100,
    ((selectedPrice - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100));
  const capPct = Math.max(0, Math.min(100,
    ((schemeCap - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100));
  const lvrThresholdPrice = snap(capacity / 0.80, STEP); // 80% LVR threshold price
  const lvrPct = Math.max(0, Math.min(100,
    ((lvrThresholdPrice - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100));

  // Context banner
  const bannerInfo   = getBanner(bd, incomeQualAny, schemeCap);
  const bannerKey    = bannerInfo.variant + (bd.schemeActive ? bd.schemeName : "");

  // CTA state
  const anyPriceAffordable = useMemo(() => {
    for (let p = SLIDER_MIN; p <= SLIDER_MAX; p += STEP) {
      const t = computeAtPrice(p, deposit, capacity, grossIncome, state, isCouple, isSingleParent, isNewBuild);
      if (!t.loanExceedsCapacity && t.cashBuffer >= 0) return true;
    }
    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacity, deposit, grossIncome, state]);

  const currentAffordable = !bd.loanExceedsCapacity && bd.cashBuffer >= 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.4} />
      <div className="absolute inset-0 overflow-y-auto">
        <div className="relative z-10 flex flex-col gap-5 px-5 pb-16 pt-10">

          {/* ── SECTION 1 — Hero borrowing power ──────────────────────────────── */}
          <motion.div className="text-center"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem",
              color: "rgba(230,251,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              Your maximum borrowing power
            </p>
            <div className="mt-1 leading-none"
              style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(2.6rem,13vw,4rem)",
                letterSpacing: "0.02em",
                background: "linear-gradient(135deg,#00C2FF,#7FFFFF)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ${heroCount.toLocaleString("en-AU")}
            </div>
            <p className="mt-2" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.76rem",
              color: "rgba(230,251,255,0.38)", lineHeight: 1.5 }}>
              Combined with your {formatCurrency(deposit)} in savings — explore what you could buy below.
            </p>
          </motion.div>

          {/* ── SECTION 2 — Recommendation banner ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
            {smartDefault.scenario === "low-savings" ? (
              <div className="rounded-2xl px-4 py-4"
                style={{ background: "rgba(239,68,68,0.07)", border: "1.5px solid rgba(239,68,68,0.4)" }}>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.1rem",
                  color: "#ef4444", letterSpacing: "0.04em", marginBottom: 8 }}>
                  Here&apos;s exactly what to focus on
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem",
                  color: "rgba(239,68,68,0.8)", lineHeight: 1.6 }}>
                  {smartDefault.reco}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.76rem",
                    color: "rgba(230,251,255,0.55)" }}>
                    💰 Save an additional {formatCurrency(Math.max(0,
                      Math.round(SLIDER_MIN * 0.05) +
                      calculateStampDuty(state, SLIDER_MIN, true, isNewBuild).payable +
                      CONV - deposit
                    ))} to reach the minimum for {formatCurrency(SLIDER_MIN)}
                  </p>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.76rem",
                    color: "rgba(230,251,255,0.55)" }}>
                    📈 The First Home Super Saver Scheme lets you withdraw up to $50,000 from super for your deposit
                  </p>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.76rem",
                    color: "rgba(230,251,255,0.55)" }}>
                    📞 A free broker call can map exactly what you need — no cost, no obligation
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl px-4 py-3"
                style={{ background: "rgba(0,86,166,0.12)", border: "1px solid rgba(0,194,255,0.2)" }}>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.65rem",
                  color: "rgba(0,194,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em",
                  marginBottom: 4 }}>
                  Our recommendation
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem",
                  color: "rgba(230,251,255,0.75)", lineHeight: 1.6 }}>
                  {hasDragged
                    ? "Drag the slider below to explore different price points and see live affordability."
                    : smartDefault.reco}
                </p>
              </div>
            )}
          </motion.div>

          {/* ── SECTION 3 — Interactive slider ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>

            {/* Price display */}
            <div className="text-center mb-5">
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.62rem",
                color: "rgba(230,251,255,0.28)", textTransform: "uppercase",
                letterSpacing: "0.12em", marginBottom: 4 }}>
                Selected property price
              </p>
              <div style={{ fontFamily: "var(--font-bebas-neue)",
                fontSize: "clamp(3rem,14vw,4.5rem)", letterSpacing: "0.02em", color: "#e6fbff",
                textShadow: "0 0 48px rgba(230,251,255,0.1)" }}>
                {formatCurrency(selectedPrice)}
              </div>
            </div>

            {/* Slider */}
            <div className="relative mx-1" style={{ height: 64 }}>
              {/* Track background */}
              <div className="absolute inset-x-0 rounded-full"
                style={{ top: "50%", transform: "translateY(-50%)", height: 8,
                  background: "rgba(10,61,107,0.55)" }} />
              {/* Filled track */}
              <div className="absolute left-0 rounded-l-full"
                style={{ top: "50%", transform: "translateY(-50%)", height: 8,
                  width: `${pricePct}%`,
                  background: bannerInfo.variant === "green"
                    ? "linear-gradient(to right,#16a34a,#22c55e)"
                    : bannerInfo.variant === "red"
                    ? "linear-gradient(to right,#dc2626,#ef4444)"
                    : "linear-gradient(to right,#0076BE,#00C2FF)" }} />
              {/* 80% LVR threshold marker */}
              {!incomeQualAny && lvrPct > 4 && lvrPct < 96 && (
                <div className="absolute" style={{
                  left: `${lvrPct}%`, top: "50%", transform: "translate(-50%,-50%)",
                  width: 2, height: 20, borderRadius: 1,
                  background: selectedPrice <= lvrThresholdPrice
                    ? "rgba(0,194,255,0.6)" : "rgba(251,146,60,0.5)",
                  zIndex: 2 }}>
                  <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
                    fontFamily: "var(--font-dm-sans)", fontSize: "0.54rem", whiteSpace: "nowrap",
                    color: "rgba(230,251,255,0.35)" }}>
                    20% dep
                  </div>
                </div>
              )}
              {/* Scheme cap marker */}
              {incomeQualAny && capPct > 2 && capPct < 98 && (
                <div className="absolute" style={{
                  left: `${capPct}%`, top: "50%", transform: "translate(-50%,-50%)",
                  width: 3, height: 24, borderRadius: 2,
                  background: selectedPrice <= schemeCap ? "rgba(34,197,94,0.9)" : "rgba(245,158,11,0.5)",
                  boxShadow: selectedPrice <= schemeCap ? "0 0 10px 2px rgba(34,197,94,0.5)" : "none",
                  transition: "background 0.3s, box-shadow 0.3s", zIndex: 2 }} />
              )}
              {/* Thumb */}
              <div className="pointer-events-none absolute" style={{
                left: `${pricePct}%`, top: "50%", transform: "translate(-50%,-50%)",
                width: 44, height: 44, borderRadius: "50%",
                background: "linear-gradient(135deg,#0056A6,#00C2FF)",
                boxShadow: "0 0 28px 8px rgba(0,194,255,0.4), 0 2px 12px rgba(0,0,0,0.4)",
                border: "3px solid rgba(255,255,255,0.3)", zIndex: 3 }} />
              {/* Native input */}
              <input type="range" min={SLIDER_MIN} max={SLIDER_MAX} step={STEP}
                value={selectedPrice}
                onChange={e => { setSelectedPrice(Number(e.target.value)); setHasDragged(true); }}
                className="absolute inset-0 w-full opacity-0"
                style={{ height: "100%", cursor: "grab", touchAction: "none", zIndex: 4 }} />
            </div>

            {/* Range labels */}
            <div className="mt-2 flex justify-between items-end"
              style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.67rem" }}>
              <span style={{ color: "rgba(230,251,255,0.2)" }}>{formatCurrency(SLIDER_MIN)}</span>
              {incomeQualAny && (
                <div className="text-center" style={{ color: selectedPrice <= schemeCap ? "rgba(34,197,94,0.7)" : "rgba(245,158,11,0.45)", transition: "color 0.3s" }}>
                  <div>Scheme cap</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600 }}>{formatCurrency(schemeCap)}</div>
                </div>
              )}
              {!incomeQualAny && (
                <div className="text-center" style={{ color: selectedPrice <= lvrThresholdPrice ? "rgba(0,194,255,0.5)" : "rgba(251,146,60,0.4)", transition: "color 0.3s" }}>
                  <div>No LMI below</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600 }}>{formatCurrency(lvrThresholdPrice)}</div>
                </div>
              )}
              <span style={{ color: "rgba(230,251,255,0.2)" }}>{formatCurrency(SLIDER_MAX)}</span>
            </div>
          </motion.div>

          {/* ── SECTION 4 — Context banner (updates on drag) ────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div key={bannerKey}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.25 }}>
              <ContextBanner info={bannerInfo} />
            </motion.div>
          </AnimatePresence>

          {/* ── SECTION 5 — Live breakdown ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
            <div className="rounded-2xl px-4 py-1"
              style={{ background: "rgba(4,30,58,0.7)", border: "1px solid rgba(10,61,107,0.55)",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>

              {/* Loan summary */}
              <div style={{ borderBottom: "1px solid rgba(10,61,107,0.4)" }}>
                <Row label="Property price" value={formatCurrency(selectedPrice)} bold />
              </div>

              <div style={{ borderBottom: "1px solid rgba(10,61,107,0.4)" }}>
                <Row label="Your deposit"
                  value={`${formatCurrency(tweenDeposit)} (${Math.round(bd.depositPct * 100)}%)`} />
              </div>
              <div style={{ borderBottom: "1px solid rgba(10,61,107,0.4)" }}>
                <Row label={bd.lmi > 0 ? `Total loan (incl. LMI)` : "Loan amount"}
                  value={formatCurrency(tweenTotalLoan)} bold />
              </div>
              <div style={{ borderBottom: "1px solid rgba(10,61,107,0.55)" }}>
                <Row label="Est. monthly repayment (6.2%, 30yr)"
                  value={`${formatCurrency(tweenRepayment)}/mo`} bold />
              </div>

              {/* Where your savings go */}
              <div className="pt-3 pb-1">
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.6rem",
                  color: "rgba(230,251,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Where your savings go
                </p>
              </div>
              <div style={{ borderBottom: "1px solid rgba(10,61,107,0.3)" }}>
                <Row label="Your available savings" value={formatCurrency(deposit)} />
              </div>
              <div style={{ borderBottom: "1px solid rgba(10,61,107,0.3)" }}>
                <Row label={bd.schemeActive
                  ? `Minimum deposit (${Math.round(bd.schemeMinDepPct * 100)}%)`
                  : `Property deposit (${Math.round(bd.depositPct * 100)}%)`}
                  value={`−${formatCurrency(tweenDeposit)}`} />
              </div>
              <div style={{ borderBottom: "1px solid rgba(10,61,107,0.3)" }}>
                <Row label="Stamp duty"
                  value={tweenStampDuty === 0 ? "$0" : `−${formatCurrency(tweenStampDuty)}`}
                  sub={tweenStampDuty === 0 ? "WAIVED ✓"
                    : bd.stampDutySaved > 0 ? `Saved ${formatCurrency(bd.stampDutySaved)}` : undefined}
                  green={tweenStampDuty === 0} />
              </div>
              <div style={{ borderBottom: "1px solid rgba(10,61,107,0.55)" }}>
                <Row label="Conveyancing + inspections" value="−$2,800" />
              </div>

              {/* Cash you keep — THE number */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.82rem",
                    color: tweenCash >= 0 ? "rgba(34,197,94,0.8)" : "rgba(239,68,68,0.8)",
                    fontWeight: 600 }}>
                    {tweenCash >= 0 ? "Cash you keep after buying" : "Shortfall"}
                  </span>
                  <span style={{ fontFamily: "var(--font-bebas-neue)",
                    fontSize: "clamp(1.5rem,7vw,2rem)",
                    color: tweenCash >= 0 ? "#22c55e" : "#ef4444",
                    textShadow: tweenCash >= 5_000 ? "0 0 24px rgba(34,197,94,0.35)" : "none" }}>
                    {tweenCash >= 0
                      ? `+${formatCurrency(tweenCash)}`
                      : `−${formatCurrency(Math.abs(tweenCash))}`}
                  </span>
                </div>
                {tweenCash < 0 && (
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem",
                    color: "rgba(239,68,68,0.6)", marginTop: 4 }}>
                    Lower the price or drag toward the scheme zone to close this gap.
                  </p>
                )}
              </div>
            </div>

            {/* LMI info card — separate from savings, clarifies it's on the loan */}
            <AnimatePresence mode="wait">
              {bd.lmi > 0 ? (
                <motion.div key="lmi-card"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                  className="mt-2 rounded-xl px-4 py-3"
                  style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.3)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem",
                        color: "#fb923c", fontWeight: 600, marginBottom: 3 }}>
                        LMI: {formatCurrency(tweenLMI)} — added to your loan
                      </p>
                      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.72rem",
                        color: "rgba(251,146,60,0.65)", lineHeight: 1.4 }}>
                        LMI is capitalised into your loan amount — it does not come out of your savings.
                        Base loan: {formatCurrency(bd.baseLoan)} + LMI: {formatCurrency(tweenLMI)} = Total: {formatCurrency(tweenTotalLoan)}.
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="lmi-waived"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                  className="mt-2 rounded-xl px-4 py-2.5"
                  style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.76rem",
                    color: "#22c55e", fontWeight: 600 }}>
                    LMI: $0 — WAIVED ✓
                  </p>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem",
                    color: "rgba(34,197,94,0.6)", marginTop: 2 }}>
                    {bd.schemeActive
                      ? `The ${bd.schemeName} guarantees your loan — no LMI required.`
                      : "Your deposit is above 20% — lenders waive LMI entirely."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── SECTION 6 — Government scheme cards ────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}>
            {incomeQualAny ? (
              <>
                <p className="mb-1" style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.2rem",
                  color: "#e6fbff", letterSpacing: "0.04em" }}>
                  Government Schemes
                </p>
                <p className="mb-3" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem",
                  color: "rgba(230,251,255,0.3)" }}>
                  Status updates live as you move the slider above.
                </p>
              </>
            ) : (
              <div className="mb-3 rounded-xl px-4 py-3"
                style={{ background: "rgba(0,194,255,0.05)", border: "1px solid rgba(0,194,255,0.2)" }}>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem",
                  color: "#00C2FF", fontWeight: 600, marginBottom: 4 }}>
                  Government schemes: income above thresholds
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.73rem",
                  color: "rgba(0,194,255,0.65)", lineHeight: 1.5 }}>
                  The good news — your borrowing power is strong. Use the slider to find your
                  ideal price point. The LMI threshold marker shows exactly where LMI kicks in.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {schemeCards.map(card => {
                const isActive  = card.status === "active";
                const isAvail   = card.status === "available";
                return (
                  <div key={card.id} className="rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(4,30,58,0.55)",
                      border: `1px solid ${isActive ? "rgba(34,197,94,0.4)" : isAvail ? "rgba(0,194,255,0.25)" : "rgba(10,61,107,0.3)"}`,
                    }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem",
                          color: isActive || isAvail ? "#e6fbff" : "rgba(230,251,255,0.35)",
                          fontWeight: 600, marginBottom: 3 }}>
                          {card.name}
                        </p>
                        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.71rem",
                          color: isActive ? "rgba(230,251,255,0.55)" : "rgba(230,251,255,0.3)",
                          lineHeight: 1.4 }}>
                          {card.what}
                        </p>
                        {(isActive || isAvail) && (
                          <>
                            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.71rem",
                              color: isActive ? "#22c55e" : "#00C2FF",
                              fontWeight: 600, marginTop: 4 }}>
                              {card.benefit}
                            </p>
                            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.64rem",
                              color: "rgba(230,251,255,0.25)", marginTop: 2 }}>
                              {card.capNote}
                            </p>
                          </>
                        )}
                        {!isActive && !isAvail && card.status === "available" && (
                          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.64rem",
                            color: "rgba(0,194,255,0.45)", marginTop: 4 }}>
                            Purchase under {formatCurrency(FHG_PRICE_CAPS[state])} to use this scheme
                          </p>
                        )}
                      </div>
                      <span className="rounded-full px-2.5 py-0.5 flex-shrink-0 mt-0.5"
                        style={{
                          background: isActive ? "rgba(34,197,94,0.15)" : isAvail ? "rgba(0,194,255,0.1)" : "rgba(60,60,80,0.2)",
                          color: isActive ? "#22c55e" : isAvail ? "#00C2FF" : "rgba(230,251,255,0.25)",
                          fontFamily: "var(--font-dm-sans)", fontSize: "0.58rem", fontWeight: 700,
                          letterSpacing: "0.06em" }}>
                        {isActive ? "ACTIVE" : isAvail ? "AVAILABLE" : "NOT ELIGIBLE"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ── SECTION 7 — CTA ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.4 }}>
            {currentAffordable ? (
              <div className="rounded-2xl px-5 py-5 text-center"
                style={{ background: "rgba(34,197,94,0.08)", border: "2px solid rgba(34,197,94,0.45)",
                  boxShadow: "0 0 36px -12px rgba(34,197,94,0.4)" }}>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.5rem",
                  color: "#22c55e", letterSpacing: "0.04em" }}>
                  ✓ You&apos;re Ready to Buy
                </p>
                <p className="mt-1 mb-4" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem",
                  color: "rgba(230,251,255,0.45)", lineHeight: 1.5 }}>
                  {bd.schemeActive
                    ? `Government schemes make your savings go further. Book a free call to lock in your strategy.`
                    : bd.lmi === 0
                    ? "Strong deposit position with zero LMI. Book a free call to get pre-approved."
                    : `At ${formatCurrency(selectedPrice)} you have a clear path to ownership. Book a free call to get started.`}
                </p>
                <button className="w-full rounded-xl py-3.5 text-base font-bold"
                  style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)",
                    color: "#020B18", fontFamily: "var(--font-dm-sans)" }}>
                  Book a Free Call →
                </button>
              </div>
            ) : anyPriceAffordable ? (
              <div className="rounded-2xl px-5 py-5 text-center"
                style={{ background: "rgba(245,158,11,0.07)", border: "1.5px solid rgba(245,158,11,0.35)" }}>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.3rem",
                  color: "#f59e0b", letterSpacing: "0.04em" }}>
                  Adjust the price above to find your entry point
                </p>
                <p className="mt-1 mb-4" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem",
                  color: "rgba(245,158,11,0.6)", lineHeight: 1.5 }}>
                  {incomeQualAny
                    ? `Drag below ${formatCurrency(schemeCap)} to unlock scheme benefits and a positive cash position.`
                    : "Use the slider to find a price where your deposit covers all costs."}
                </p>
                <button className="w-full rounded-xl py-3 text-sm font-semibold"
                  style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)",
                    color: "#f59e0b", fontFamily: "var(--font-dm-sans)" }}>
                  Book a Free Strategy Call →
                </button>
              </div>
            ) : (
              <div className="rounded-2xl px-5 py-5"
                style={{ background: "rgba(4,30,58,0.65)", border: "1px solid rgba(10,61,107,0.5)" }}>
                <p style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "1.3rem",
                  color: "#e6fbff", letterSpacing: "0.04em" }}>
                  Get a Free Plan to Reach Your Goal
                </p>
                <p className="mt-1 mb-4" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.78rem",
                  color: "rgba(230,251,255,0.45)", lineHeight: 1.5 }}>
                  Talk to a broker about getting ready to buy — free, no obligation.
                  They can show you exactly what to build toward and how fast you can get there.
                </p>
                <button className="w-full rounded-xl py-3 text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)",
                    color: "#020B18", fontFamily: "var(--font-dm-sans)" }}>
                  Book a Free Call →
                </button>
              </div>
            )}
          </motion.div>

          <p className="pb-4 text-center"
            style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem",
              color: "rgba(230,251,255,0.18)" }}>
            Estimates only. Speak with a licensed broker for a formal assessment.
          </p>

        </div>
      </div>
    </div>
  );
}
