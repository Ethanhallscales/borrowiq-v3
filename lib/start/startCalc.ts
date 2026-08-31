/* ============================================================
   /start CALC ENGINE
   Direct port of the Assist Loans website Help to Buy calculator
   (components/HelpToBuyCalculator.tsx) — the serviceability maths,
   scheme constants and price-cap lookup are unchanged. Only
   difference: debts are richer here (credit card limits, HECS
   balance, car/personal loan repayments) and there is NO
   eligibility gating — every input still returns full numbers.

   Pure functions only, no React — so the UI can stay dumb and a
   webhook can be added later without touching the maths.
   ============================================================ */

import {
  TAX_BRACKETS,
  MEDICARE_LEVY_RATE,
  HECS_BANDS,
  HEM_SINGLE_MONTHLY,
  HEM_COUPLE_MONTHLY,
  HEM_PER_DEPENDANT_MONTHLY,
  HEM_SCALE_INCOME_THRESHOLD,
  HEM_SCALE_RATE,
  CREDIT_CARD_COMMITMENT_RATE,
  ADVERTISED_RATE,
  ASSESSED_RATE,
  BORROWING_CONSERVATISM_FACTOR,
} from "./borrowingPowerConfig";
import { capFor, type CapRegion } from "./locationCaps";

export const LOAN_TERM_YEARS = 30;
export const INCOME_CAP_SINGLE = 103000;
export const INCOME_CAP_JOINT = 165000;
export const MIN_DEPOSIT_PCT = 0.02;
export const MIN_GOV_PCT = 0.05;
export const QLD_FHOG = 30000;
export const QLD_FHOG_CAP = 750000;
export const FHG_DEPOSIT_PCT = 0.05;
export const FHG_LOAN_PCT = 0.95;

export type Mode = "htb" | "fhg";
export type ApplicantType = "single" | "joint";

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(
    Math.round(n || 0),
  );

export const monthlyRepayment = (principal: number) => {
  if (principal <= 0) return 0;
  const r = ADVERTISED_RATE / 12;
  const n = LOAN_TERM_YEARS * 12;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
};

export const annualIncomeTax = (gross: number) => {
  let tax = 0;
  for (const b of TAX_BRACKETS) {
    if (gross <= b.min) break;
    const top = b.max === null ? gross : Math.min(gross, b.max);
    tax += (top - b.min) * b.rate;
  }
  return tax;
};

export const monthlyNetIncome = (gross: number) => {
  if (gross <= 0) return 0;
  return (gross - annualIncomeTax(gross) - gross * MEDICARE_LEVY_RATE) / 12;
};

// Top HECS band is a flat rate on total repayment income, not marginal-on-excess —
// that's how the ATO defines it, and it's continuous with the marginal bands below it.
export const annualHecsRepayment = (gross: number) => {
  const topBand = HECS_BANDS[HECS_BANDS.length - 1];
  if (gross > topBand.min) return gross * topBand.rate;
  let repayment = 0;
  for (const b of HECS_BANDS) {
    if (gross <= b.min || b.rate === 0) continue;
    const top = b.max === null ? gross : Math.min(gross, b.max);
    repayment += (top - b.min) * b.rate;
  }
  return repayment;
};

export const livingExpensesMonthly = (
  applicantType: ApplicantType,
  dependants: number,
  combinedGrossAnnual: number,
  combinedMonthlyNet: number,
) => {
  const base =
    (applicantType === "joint" ? HEM_COUPLE_MONTHLY : HEM_SINGLE_MONTHLY) + dependants * HEM_PER_DEPENDANT_MONTHLY;
  if (combinedGrossAnnual > HEM_SCALE_INCOME_THRESHOLD) {
    return Math.max(base, combinedMonthlyNet * HEM_SCALE_RATE);
  }
  return base;
};

export const maxLoanFromSurplus = (surplus: number) => {
  if (surplus <= 0) return 0;
  const r = ASSESSED_RATE / 12;
  const n = LOAN_TERM_YEARS * 12;
  const raw = (surplus * (1 - Math.pow(1 + r, -n))) / r;
  return raw * BORROWING_CONSERVATISM_FACTOR;
};

/* ── QLD stamp duty (only state with its own numbers on the site) ────────── */

export const qldStandardDuty = (p: number) => {
  if (p <= 5000) return 0;
  if (p <= 75000) return (p - 5000) * 0.015;
  if (p <= 540000) return 1050 + (p - 75000) * 0.035;
  if (p <= 1000000) return 17325 + (p - 540000) * 0.045;
  return 38025 + (p - 1000000) * 0.0575;
};

export const qldDutySaved = (p: number, isFirstHome: boolean, isNew: boolean) => {
  const standard = qldStandardDuty(p);
  if (isFirstHome && isNew) return standard;
  if (isFirstHome) {
    if (p <= 700000) return standard;
    if (p <= 800000) return standard * (1 - (p - 700000) / 100000);
    return 7175;
  }
  return 7175;
};

/* ── Inputs ──────────────────────────────────────────────────────────────── */

export type CalcInputs = {
  applicantType: ApplicantType;
  dependants: number;
  income1: number;
  income2: number;
  deposit: number;
  homeType: "new" | "existing" | null;
  firstHome: boolean;
  capKey: string;          // state key for the cap tables, e.g. "QLD"
  region: CapRegion;
  /* debts */
  creditCardLimits: number;      // total limits, not balances
  hecsBalance: number;           // outstanding HECS/HELP balance
  otherLoanRepayments: number;   // car + personal loans, monthly
};

export type SchemeResult = {
  maxPrice: number;
  deposit: number;
  depositRequired: number;
  govShare: number;
  govPct: number;
  loan: number;
  monthlyRepayment: number;
  cappedByArea: boolean;
  priceCap: number;
  dutySaved: number;
  grant: number;
  totalSupport: number;
};

export type CalcResult = {
  /* serviceability internals — shown as "how we got there" and logged */
  combinedIncome: number;
  combinedMonthlyNet: number;
  livingExpenses: number;
  hecsMonthly: number;
  creditCardMonthly: number;
  otherLoansMonthly: number;
  totalCommitments: number;
  monthlySurplus: number;
  borrowingCapacity: number;
  /* per-mode outputs */
  htb: SchemeResult | null;
  fhg: SchemeResult | null;
  /* soft, non-blocking flags */
  incomeCap: number;
  incomeOverCap: boolean;
  buyingAloneMax: number;   // what they'd reach with no scheme help
};

/* ── The engine ──────────────────────────────────────────────────────────── */

export function runCalc(i: CalcInputs): CalcResult {
  const combinedIncome = (i.income1 || 0) + (i.applicantType === "joint" ? i.income2 || 0 : 0);
  const deposit = Math.max(i.deposit || 0, 0);
  const dependants = Math.max(i.dependants || 0, 0);

  const netMonthly1 = monthlyNetIncome(i.income1 || 0);
  const netMonthly2 = i.applicantType === "joint" ? monthlyNetIncome(i.income2 || 0) : 0;
  const combinedMonthlyNet = netMonthly1 + netMonthly2;

  const livingExpenses = livingExpensesMonthly(i.applicantType, dependants, combinedIncome, combinedMonthlyNet);

  // A HECS balance only bites through the compulsory repayment, which is set by
  // income, not by the size of the balance — so any balance > 0 switches the
  // ATO repayment on, exactly like the website's yes/no question did.
  const hecsMonthly = (i.hecsBalance || 0) > 0 ? annualHecsRepayment(combinedIncome) / 12 : 0;
  const creditCardMonthly = Math.max(i.creditCardLimits || 0, 0) * CREDIT_CARD_COMMITMENT_RATE;
  const otherLoansMonthly = Math.max(i.otherLoanRepayments || 0, 0);
  const totalCommitments = creditCardMonthly + otherLoansMonthly + hecsMonthly;

  const monthlySurplus = Math.max(combinedMonthlyNet - livingExpenses - totalCommitments, 0);
  const borrowingCapacity = maxLoanFromSurplus(monthlySurplus);

  const incomeCap = i.applicantType === "single" && dependants === 0 ? INCOME_CAP_SINGLE : INCOME_CAP_JOINT;
  const incomeOverCap = combinedIncome > incomeCap;

  const maxGovPct = i.homeType === "new" ? 0.4 : 0.3;
  const isQld = i.capKey === "QLD";
  const isNew = i.homeType === "new";

  const htbCap = i.capKey ? capFor("htb", i.capKey, i.region) : null;
  const fhgCap = i.capKey ? capFor("fhg", i.capKey, i.region) : null;

  let htb: SchemeResult | null = null;
  if (htbCap && deposit > 0 && combinedIncome > 0) {
    const rawMax = borrowingCapacity / (1 - MIN_DEPOSIT_PCT - maxGovPct);
    const depositConstrainedMax = deposit / MIN_DEPOSIT_PCT;
    const maxPrice = Math.min(rawMax, depositConstrainedMax, htbCap);
    const govShare = Math.min(maxGovPct * maxPrice, Math.max(maxPrice - deposit, 0));
    const loan = Math.max(maxPrice - deposit - govShare, 0);
    const dutySaved = isQld ? qldDutySaved(maxPrice, i.firstHome, isNew) : 0;
    const grant = isQld && i.firstHome && isNew && maxPrice <= QLD_FHOG_CAP ? QLD_FHOG : 0;
    htb = {
      maxPrice,
      deposit,
      depositRequired: deposit,
      govShare,
      govPct: maxPrice > 0 ? govShare / maxPrice : 0,
      loan,
      monthlyRepayment: monthlyRepayment(loan),
      cappedByArea: rawMax > htbCap,
      priceCap: htbCap,
      dutySaved,
      grant,
      totalSupport: govShare + dutySaved + grant,
    };
  }

  let fhg: SchemeResult | null = null;
  if (fhgCap && deposit > 0 && combinedIncome > 0) {
    const maxByCapacity = borrowingCapacity / FHG_LOAN_PCT;
    const maxByDeposit = deposit / FHG_DEPOSIT_PCT;
    const maxPrice = Math.min(maxByCapacity, maxByDeposit, fhgCap);
    const depositRequired = maxPrice * FHG_DEPOSIT_PCT;
    const loan = Math.max(maxPrice - depositRequired, 0);
    const dutySaved = isQld ? qldDutySaved(maxPrice, i.firstHome, isNew) : 0;
    const grant = isQld && i.firstHome && isNew && maxPrice <= QLD_FHOG_CAP ? QLD_FHOG : 0;
    fhg = {
      maxPrice,
      deposit,
      depositRequired,
      govShare: 0,
      govPct: 0,
      loan,
      monthlyRepayment: monthlyRepayment(loan),
      cappedByArea: Math.min(maxByCapacity, maxByDeposit) > fhgCap,
      priceCap: fhgCap,
      dutySaved,
      grant,
      totalSupport: dutySaved + grant,
    };
  }

  return {
    combinedIncome,
    combinedMonthlyNet,
    livingExpenses,
    hecsMonthly,
    creditCardMonthly,
    otherLoansMonthly,
    totalCommitments,
    monthlySurplus,
    borrowingCapacity,
    htb,
    fhg,
    incomeCap,
    incomeOverCap,
    buyingAloneMax: deposit + borrowingCapacity,
  };
}
