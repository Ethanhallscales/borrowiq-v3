/* ============================================================
   /start CALC ENGINE
   Direct port of the Assist Loans website Help to Buy calculator
   (components/HelpToBuyCalculator.tsx) — the serviceability maths,
   scheme constants and price-cap lookup are unchanged. Only
   difference: debts are richer here (credit card limits, HECS
   balance, car/personal loan repayments) and there is NO
   eligibility gating — every input still returns full numbers.

   Pure functions only, no React — so the UI can stay dumb and the
   webhook route can build its payload without touching the maths.

   DEPOSIT MODEL: max purchase price always uses the buyer's FULL
   deposit, never the scheme minimum. The scheme minimum (2% HTB /
   5% FHG) is reported separately as `minDeposit` so the results
   screen can show "you could get in with as little as $X".
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
  CHILD_SUPPORT_SHADING,
  FAMILY_PAYMENTS_SHADING,
  OTHER_GOV_SUPPORT_SHADING,
} from "./borrowingPowerConfig";
import { capFor, type CapRegion } from "./locationCaps";
import { calculateStampDuty } from "@/lib/stamp-duty";
import type { AustralianState } from "@/lib/types";

export const LOAN_TERM_YEARS = 30;
export const INCOME_CAP_SINGLE = 103000;
export const INCOME_CAP_JOINT = 165000;
export const MIN_DEPOSIT_PCT = 0.02;
export const MIN_GOV_PCT = 0.05;
export const QLD_FHOG = 30000;
export const QLD_FHOG_CAP = 750000;
export const FHG_DEPOSIT_PCT = 0.05;
export const FHG_LOAN_PCT = 0.95;

/* ── Qualification thresholds ─────────────────────────────────────────────
   The first two mirror the live BorrowIQ calculator exactly (see
   calculatePathA in lib/calculations.ts): borrowing capacity has to reach
   a $500k purchase with a 5% deposit, and the deposit has to survive the
   5% + stamp duty + $2,800 of conveyancing/inspection costs at that price.
   The third is the /start-specific rule: Help to Buy has to actually get
   them to $500k. All three must pass.                                    */
export const QUALIFY_PRICE = 500000;
export const QUALIFY_DEPOSIT_PCT = 0.05;
export const QUALIFY_OTHER_COSTS = 2800; // conveyancing + building inspection

// See RULE 1 in runCalc — the live calculator's raw $475k capacity threshold
// is calibrated to a different engine. false = keep the rule's intent.
export const QUALIFY_LITERAL_CAPACITY_RULE = false;

// The stamp duty tables only cover the eight states/territories. /start can
// resolve to JBT/CKI via postcode, which have no table of their own — fall
// back to QLD so the qualification check still runs rather than throwing.
const DUTY_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const dutyStateFor = (capKey: string): AustralianState =>
  (DUTY_STATES.includes(capKey) ? capKey : "QLD") as AustralianState;

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
  /* supplementary income — all MONTHLY and all non-taxable, so they are
     added to net income directly rather than run through the tax tables */
  childSupportMonthly: number;      // maintenance received, not paid
  familyPaymentsMonthly: number;    // Family Tax Benefit A & B
  otherGovSupportMonthly: number;   // DSP, Carer Payment, Age Pension etc.
  /* debts */
  creditCardLimits: number;      // total limits, not balances
  hecsBalance: number;           // outstanding HECS/HELP balance
  otherLoanRepayments: number;   // car + personal loans, monthly
};

export type SchemeResult = {
  maxPrice: number;
  deposit: number;          // the buyer's full deposit, as entered
  depositRequired: number;  // what they'd actually put in at maxPrice
  minDeposit: number;       // scheme minimum at maxPrice — the "as little as $X" figure
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
  combinedIncome: number;            // gross TAXABLE income only
  combinedMonthlyNet: number;        // salary after tax + supplementary income
  salaryMonthlyNet: number;          // salary component alone
  childSupportCounted: number;       // monthly, after shading
  familyPaymentsCounted: number;     // monthly, after shading
  otherGovSupportCounted: number;    // monthly, after shading
  supplementaryMonthly: number;      // the three above, combined
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
  /* qualification — decides which CTA the results screen shows.
     Never surfaced to the user as a "you don't qualify" message. */
  qualified: boolean;
  qualifiedReason: QualifiedReason;
  qualifyDepositShortfall: number; // $ short of the deposit + costs test, 0 if passing
};

/* "" when qualified. Otherwise the FIRST rule that failed, in the order the
   live calculator applies them, so the results screen knows which single
   "how to get there" tip to lead with. */
export type QualifiedReason =
  | ""
  | "capacity_below_500k"
  | "deposit_short_of_costs"
  | "htb_max_below_500k";

/* ── The engine ──────────────────────────────────────────────────────────── */

export function runCalc(i: CalcInputs): CalcResult {
  const combinedIncome = (i.income1 || 0) + (i.applicantType === "joint" ? i.income2 || 0 : 0);
  const deposit = Math.max(i.deposit || 0, 0);
  const dependants = Math.max(i.dependants || 0, 0);

  const netMonthly1 = monthlyNetIncome(i.income1 || 0);
  const netMonthly2 = i.applicantType === "joint" ? monthlyNetIncome(i.income2 || 0) : 0;
  const salaryMonthlyNet = netMonthly1 + netMonthly2;

  /* Supplementary income is tax-free, so it goes straight onto NET income —
     running it through monthlyNetIncome() would tax money that isn't taxed.
     For the same reason it is deliberately absent from `combinedIncome`,
     which drives the HECS repayment and the Help to Buy income cap: both are
     assessed on taxable income, and counting family payments there would
     invent a HECS liability and push people over the cap for no reason. */
  const childSupportCounted = Math.max(i.childSupportMonthly || 0, 0) * CHILD_SUPPORT_SHADING;
  const familyPaymentsCounted = Math.max(i.familyPaymentsMonthly || 0, 0) * FAMILY_PAYMENTS_SHADING;
  const otherGovSupportCounted = Math.max(i.otherGovSupportMonthly || 0, 0) * OTHER_GOV_SUPPORT_SHADING;
  const supplementaryMonthly = childSupportCounted + familyPaymentsCounted + otherGovSupportCounted;

  const combinedMonthlyNet = salaryMonthlyNet + supplementaryMonthly;

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
    /* price = deposit + government share + loan, subject to three ceilings:
         1. serviceability — loan can't exceed capacity, so
            price(1 - govPct) <= capacity + FULL deposit
         2. scheme minimum  — the buyer must still contribute at least 2%
         3. the area price cap                                            */
    const capacityMax = (borrowingCapacity + deposit) / (1 - maxGovPct);
    const depositConstrainedMax = deposit / MIN_DEPOSIT_PCT;
    const maxPrice = Math.min(capacityMax, depositConstrainedMax, htbCap);

    const govShare = Math.min(maxGovPct * maxPrice, Math.max(maxPrice - deposit, 0));
    const loan = Math.min(borrowingCapacity, Math.max(maxPrice - deposit - govShare, 0));
    // What they actually have to put in at this price — never more than their
    // full deposit, and less than it when the area cap is what's binding.
    const depositRequired = Math.max(maxPrice - govShare - loan, 0);
    const dutySaved = isQld ? qldDutySaved(maxPrice, i.firstHome, isNew) : 0;
    const grant = isQld && i.firstHome && isNew && maxPrice <= QLD_FHOG_CAP ? QLD_FHOG : 0;
    htb = {
      maxPrice,
      deposit,
      depositRequired,
      minDeposit: maxPrice * MIN_DEPOSIT_PCT,
      govShare,
      govPct: maxPrice > 0 ? govShare / maxPrice : 0,
      loan,
      monthlyRepayment: monthlyRepayment(loan),
      cappedByArea: Math.min(capacityMax, depositConstrainedMax) > htbCap,
      priceCap: htbCap,
      dutySaved,
      grant,
      totalSupport: govShare + dutySaved + grant,
    };
  }

  let fhg: SchemeResult | null = null;
  if (fhgCap && deposit > 0 && combinedIncome > 0) {
    /* Same shape, no government share: the loan is capped at 95% of price
       AND at borrowing capacity, and the buyer brings the rest.
       price <= capacity + FULL deposit, and price <= deposit / 5%.       */
    const maxByCapacity = borrowingCapacity + deposit;
    const maxByDeposit = deposit / FHG_DEPOSIT_PCT;
    const maxPrice = Math.min(maxByCapacity, maxByDeposit, fhgCap);
    const loan = Math.min(borrowingCapacity, maxPrice * FHG_LOAN_PCT);
    const depositRequired = Math.max(maxPrice - loan, 0);
    const dutySaved = isQld ? qldDutySaved(maxPrice, i.firstHome, isNew) : 0;
    const grant = isQld && i.firstHome && isNew && maxPrice <= QLD_FHOG_CAP ? QLD_FHOG : 0;
    fhg = {
      maxPrice,
      deposit,
      depositRequired,
      minDeposit: maxPrice * FHG_DEPOSIT_PCT,
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

  /* ── Qualification ─────────────────────────────────────────────────────
     Rules 1 and 2 are lifted verbatim from calculatePathA in
     lib/calculations.ts so /start and the live calculator agree on who is
     a "QUALIFIED" lead. Rule 3 is the /start addition.                   */
  const minDep500 = QUALIFY_PRICE * QUALIFY_DEPOSIT_PCT;
  const { payable: dutyAt500 } = calculateStampDuty(
    dutyStateFor(i.capKey),
    QUALIFY_PRICE,
    i.firstHome,
    isNew,
  );
  const cashAfterCosts500 = deposit - minDep500 - dutyAt500 - QUALIFY_OTHER_COSTS;

  /* RULE 1 — "can they afford a $500k property?"
     The live calculator writes this as `capacity >= $475,000`, but that
     threshold was calibrated against ITS capacity number, which is computed
     on a different basis (HEM $4,000/mo vs $5,300, an 8.50% APRA floor vs
     8.90% assessed, and no 0.95 conservatism factor). On the same inputs the
     live engine returns ~$606k where /start returns ~$468k — so reusing the
     literal $475k here would tag almost every /start lead as NURTURE.
     We keep the rule's intent instead: their capacity plus their FULL deposit
     has to reach a $500k purchase. Flip QUALIFY_LITERAL_CAPACITY_RULE to true
     to use the live calculator's raw threshold instead. */
  const capacityOk = QUALIFY_LITERAL_CAPACITY_RULE
    ? borrowingCapacity >= QUALIFY_PRICE - minDep500
    : borrowingCapacity + deposit >= QUALIFY_PRICE;
  const depositOk = cashAfterCosts500 >= 0;
  const htbReachesFloor = (htb?.maxPrice ?? 0) >= QUALIFY_PRICE;

  const qualified = capacityOk && depositOk && htbReachesFloor;
  const qualifiedReason: QualifiedReason = qualified
    ? ""
    : !capacityOk
      ? "capacity_below_500k"
      : !depositOk
        ? "deposit_short_of_costs"
        : "htb_max_below_500k";

  return {
    combinedIncome,
    combinedMonthlyNet,
    salaryMonthlyNet,
    childSupportCounted,
    familyPaymentsCounted,
    otherGovSupportCounted,
    supplementaryMonthly,
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
    qualified,
    qualifiedReason,
    qualifyDepositShortfall: Math.max(-cashAfterCosts500, 0),
  };
}
