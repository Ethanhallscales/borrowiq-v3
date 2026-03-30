/**
 * All financial calculations — client-side only, no external calls.
 */

import type { QuizData, BuyingSituation } from "./types";
import { calculateStampDuty } from "./stamp-duty";

// ─── Constants ────────────────────────────────────────────────────────────────

export const MARKET_RATE      = 0.062;  // 6.2% — market average for display
export const MIN_ASSESSED_RATE = 0.085; // APRA floor 8.5%
export const LOAN_TERM_YEARS   = 30;
export const LOAN_TERM_MONTHS  = LOAN_TERM_YEARS * 12;

// ─── Tax (2025/26 Australian brackets) ───────────────────────────────────────

export function calculateTax(grossIncome: number): { tax: number; netIncome: number } {
  let tax = 0;
  if (grossIncome <= 18_200)       tax = 0;
  else if (grossIncome <= 45_000)  tax = (grossIncome - 18_200) * 0.19;
  else if (grossIncome <= 120_000) tax = 5_092 + (grossIncome - 45_000) * 0.325;
  else if (grossIncome <= 180_000) tax = 29_467 + (grossIncome - 120_000) * 0.37;
  else                             tax = 51_667 + (grossIncome - 180_000) * 0.45;

  // LITO
  let lito = 0;
  if (grossIncome <= 37_500)      lito = 700;
  else if (grossIncome <= 45_000) lito = 700 - (grossIncome - 37_500) * 0.05;
  else if (grossIncome <= 66_667) lito = 325 - (grossIncome - 45_000) * 0.015;

  // Medicare levy (2%)
  const medicare = grossIncome * 0.02;

  const totalTax = Math.max(0, tax - lito + medicare);
  return { tax: totalTax, netIncome: grossIncome - totalTax };
}

// ─── HECS repayment (annual, based on income) ─────────────────────────────────

export function calculateHecsRepayment(grossIncome: number): number {
  const HECS_THRESHOLDS = [
    { threshold: 51_550,  rate: 0.01 },
    { threshold: 60_440,  rate: 0.02 },
    { threshold: 67_754,  rate: 0.025 },
    { threshold: 73_110,  rate: 0.03 },
    { threshold: 79_100,  rate: 0.035 },
    { threshold: 86_175,  rate: 0.04 },
    { threshold: 91_339,  rate: 0.045 },
    { threshold: 100_716, rate: 0.05 },
    { threshold: 107_214, rate: 0.055 },
    { threshold: 120_197, rate: 0.06 },
    { threshold: 128_929, rate: 0.065 },
    { threshold: 141_848, rate: 0.07 },
  ];
  const bracket = [...HECS_THRESHOLDS].reverse().find(b => grossIncome >= b.threshold);
  return bracket ? grossIncome * bracket.rate : 0;
}

// ─── HEM (Household Expenditure Measure) monthly ─────────────────────────────

export function getHEM(situation: BuyingSituation, dependants: number): number {
  const dep = Math.min(dependants, 3);
  const base: Record<string, number[]> = {
    solo:           [2_200, 2_800, 3_200, 3_600],
    partner:        [3_000, 3_600, 4_000, 4_400],
    "single-parent": [2_800, 3_100, 3_500, 3_900],
  };
  return base[situation]?.[dep] ?? 2_200;
}

// ─── Annuity PMT ─────────────────────────────────────────────────────────────

export function pmt(annualRate: number, principal: number): number {
  if (annualRate === 0) return principal / LOAN_TERM_MONTHS;
  const r = annualRate / 12;
  const n = LOAN_TERM_MONTHS;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function pvAnnuity(annualRate: number, monthlyPayment: number): number {
  if (annualRate === 0) return monthlyPayment * LOAN_TERM_MONTHS;
  const r = annualRate / 12;
  const n = LOAN_TERM_MONTHS;
  return monthlyPayment * (1 - Math.pow(1 + r, -n)) / r;
}

// ─── LMI ─────────────────────────────────────────────────────────────────────

export function calculateLMI(loanAmount: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  const lvr = loanAmount / propertyValue;
  if (lvr <= 0.80) return 0;
  if (lvr <= 0.85) return loanAmount * 0.005;
  if (lvr <= 0.90) return loanAmount * 0.012;
  if (lvr <= 0.95) return loanAmount * 0.022;
  return loanAmount * 0.035;
}

// ─── Path A results ───────────────────────────────────────────────────────────

export interface ResultsA {
  borrowingCapacity: number;
  purchasePower:     number;     // capacity + deposit
  monthlyRepayment:  number;     // at market rate
  lvr:               number;     // percentage
  lmi:               number;
  stampDuty:         number;
  stampDutyPayable:  number;
  stampDutySaved:    number;
  totalUpfront:      number;     // deposit + payable duty + lmi + conveyancing + inspection
  qualified:         boolean;    // capacity >= $500k AND deposit >= $30k
  grossIncome:       number;     // for grants check
}

export function calculatePathA(quiz: QuizData): ResultsA {
  const {
    buyingSituation = "solo",
    annualIncome    = 0,
    partnerIncome   = 0,
    deposit         = 0,
    creditCardLimit = 0,
    carLoanMonthly  = 0,
    personalLoanMonthly = 0,
    hecsDebt        = 0,
    dependants      = 0,
    state           = "QLD",
    propertyType,
  } = quiz;

  // All users treated as PAYG — 100% of stated income
  const combinedGross  = annualIncome + (buyingSituation === "partner" ? partnerIncome : 0);

  const { netIncome: primaryNet } = calculateTax(annualIncome);
  const partnerGross = buyingSituation === "partner" ? partnerIncome : 0;
  const { netIncome: partnerNet  } = calculateTax(partnerGross);
  const totalNetAnnual = primaryNet + partnerNet;
  const monthlyNet     = totalNetAnnual / 12;

  // Monthly commitments
  const hecsAnnual  = hecsDebt > 0 ? calculateHecsRepayment(annualIncome) : 0;
  const monthlyComm = (creditCardLimit * 0.038) / 12
    + carLoanMonthly
    + personalLoanMonthly
    + hecsAnnual / 12;

  // HEM
  const hem = getHEM(buyingSituation, dependants);

  // Monthly surplus
  const surplus = Math.max(0, monthlyNet - monthlyComm - hem);

  // Assessment rate
  const assessedRate = Math.max(MARKET_RATE + 0.03, MIN_ASSESSED_RATE);
  const capacity     = Math.round(pvAnnuity(assessedRate, surplus) / 1000) * 1000;

  // Purchase power
  const purchasePower = capacity + deposit;
  const lvr           = purchasePower > 0 ? (capacity / purchasePower) * 100 : 0;

  // Monthly repayment at MARKET rate (for display)
  const monthlyRepayment = Math.round(pmt(MARKET_RATE, capacity));

  // LMI
  const lmi = calculateLMI(capacity, purchasePower);

  // Stamp duty
  const isNewBuild = propertyType === "land";
  const { base, concession, payable } = calculateStampDuty(state, purchasePower, true, isNewBuild);

  const totalUpfront = deposit + payable + lmi + 2_000 + 800; // conveyancing + inspection

  // Qualification: can they afford a $500k property?
  // Need 5% deposit ($25k) + stamp duty + $2,800 conveyancing/inspection, with positive cash left.
  const QUALIFY_PRICE = 500_000;
  const minDep500  = QUALIFY_PRICE * 0.05;
  const { payable: dutyAt500 } = calculateStampDuty(state, QUALIFY_PRICE, true, isNewBuild);
  const cashAfterCosts500 = deposit - minDep500 - dutyAt500 - 2_800;
  const qualified = capacity >= (QUALIFY_PRICE - minDep500) && cashAfterCosts500 >= 0;

  return {
    borrowingCapacity: capacity,
    purchasePower,
    monthlyRepayment,
    lvr: Math.round(lvr * 10) / 10,
    lmi:   Math.round(lmi),
    stampDuty: Math.round(base),
    stampDutyPayable: Math.round(payable),
    stampDutySaved: Math.round(concession),
    totalUpfront: Math.round(totalUpfront),
    qualified,
    grossIncome: combinedGross,
  };
}

// ─── Path B results ───────────────────────────────────────────────────────────

export interface ResultsB {
  grossEquity:          number;
  usableEquity:         number;  // theoretical max at 80% LVR of current property
  affordableEquityDraw: number;  // serviceability-capped: what they can actually borrow against equity
  newPropertyLoan:      number;  // remaining borrowing capacity for the new property loan
  totalBudget:          number;  // affordableEquityDraw + newPropertyLoan (or netSaleProceeds + newPropertyLoan)
  monthlyRepayment:     number;  // on all new debt at market rate
  newLvr:               number;
  stampDuty:            number;
  stampDutyPayable:     number;
  totalUpfront:         number;
  // selling scenario
  netSaleProceeds?:     number;
  // keeping scenario
  monthlyRentalEst?:    number;
  netMonthlyCashflow?:  number;
}

export function calculatePathB(quiz: QuizData): ResultsB {
  const {
    buyingSituation    = "solo",
    annualIncome       = 0,
    partnerIncome      = 0,
    currentPropertyValue = 0,
    currentLoanBalance   = 0,
    currentRate          = MARKET_RATE,
    currentMonthlyRepayment = 0,
    monthlyRentalIncome    = 0,
    targetPropertyPrice    = 600_000,
    targetState            = "QLD",
    targetPropertyType,
    currentPropertyPlan,
    creditCardLimit        = 0,
    carLoanMonthly         = 0,
    personalLoanMonthly    = 0,
    hecsDebt               = 0,
    dependants             = 0,
  } = quiz;

  const isSelling = currentPropertyPlan === "selling";

  // ── Equity ────────────────────────────────────────────────────────────────
  const grossEquity  = Math.max(0, currentPropertyValue - currentLoanBalance);
  const usableEquity = Math.max(0, currentPropertyValue * 0.8 - currentLoanBalance);

  // ── Income (all users treated as PAYG — 100% of stated income) ────────────
  const partnerGross = buyingSituation === "partner" ? partnerIncome : 0;
  const shadedRental  = monthlyRentalIncome * 12 * 0.8;

  const { netIncome: pNet } = calculateTax(annualIncome + partnerGross);
  const rentalNet           = shadedRental * 0.68;
  const monthlyNet          = (pNet + rentalNet) / 12;

  // ── Monthly surplus ────────────────────────────────────────────────────────
  // The existing mortgage is NOT subtracted here. Instead we compute the maximum
  // total debt this surplus can service (maxTotalDebt), then subtract the current
  // loan balance to find how much MORE can be borrowed. This correctly prices
  // equity access as borrowed money that must be serviced, not free cash.
  const hecsAnnual  = hecsDebt > 0 ? calculateHecsRepayment(annualIncome) : 0;
  const monthlyComm = (creditCardLimit * 0.038) / 12
    + carLoanMonthly
    + personalLoanMonthly
    + hecsAnnual / 12;

  const hem     = getHEM(buyingSituation, dependants);
  const surplus = Math.max(0, monthlyNet - monthlyComm - hem);

  // ── Serviceability ceiling ─────────────────────────────────────────────────
  const assessedRate = Math.max(currentRate + 0.03, MIN_ASSESSED_RATE);
  const maxTotalDebt = pvAnnuity(assessedRate, surplus);

  // When selling, the existing mortgage is retired from sale proceeds — no
  // existing debt carries forward. When keeping (or undecided), the current
  // loan balance occupies part of the serviceability ceiling.
  const effectiveExistingDebt  = isSelling ? 0 : currentLoanBalance;
  const maxAdditionalBorrowing = Math.round(
    Math.max(0, maxTotalDebt - effectiveExistingDebt) / 1000
  ) * 1000;

  // ── Affordable equity draw (keeping / undecided only) ──────────────────────
  // Equity access = new borrowing against current property. It competes with the
  // new property loan for the same serviceability budget. Cannot exceed usable
  // equity OR the total additional borrowing capacity.
  const affordableEquityDraw = isSelling
    ? 0
    : Math.min(maxAdditionalBorrowing, usableEquity);

  // ── New property loan ─────────────────────────────────────────────────────
  // Remaining serviceability capacity after the equity draw is claimed.
  const newPropertyLoan = Math.max(0, maxAdditionalBorrowing - affordableEquityDraw);

  // ── Total budget ───────────────────────────────────────────────────────────
  // Selling: sale cash (not a new loan) + borrowing capacity (no existing debt overhead)
  // Keeping / undecided: equity draw + new property loan = maxAdditionalBorrowing
  const agentFees           = currentPropertyValue * 0.025;
  const netSaleProceedsAmt  = Math.round(
    Math.max(0, currentPropertyValue - currentLoanBalance - agentFees - 5_000)
  );
  const totalBudget = isSelling
    ? netSaleProceedsAmt + maxAdditionalBorrowing
    : maxAdditionalBorrowing;

  // ── LVR on the new property ────────────────────────────────────────────────
  const depositForNewProp  = isSelling ? netSaleProceedsAmt : affordableEquityDraw;
  const loanForNewProperty = Math.max(0, targetPropertyPrice - depositForNewProp);
  const newLvr             = targetPropertyPrice > 0
    ? (loanForNewProperty / targetPropertyPrice) * 100
    : 0;

  // ── Monthly repayment on all new debt at market rate ──────────────────────
  // For keeping: covers both equity draw + new property loan (= maxAdditionalBorrowing).
  // For selling: equity draw is zero so this is just the new property loan component.
  const monthlyRepayment = Math.round(pmt(MARKET_RATE, maxAdditionalBorrowing));

  // ── Stamp duty (no FHB concession for next purchase) ──────────────────────
  const isNewBuild = targetPropertyType === "land";
  const { base, payable } = calculateStampDuty(targetState, targetPropertyPrice, false, isNewBuild);
  const totalUpfront = Math.round(affordableEquityDraw + payable + 2_000 + 800);

  // ── Scenario: Selling ──────────────────────────────────────────────────────
  const netSaleProceeds = (isSelling || currentPropertyPlan === "undecided")
    ? netSaleProceedsAmt
    : undefined;

  // ── Scenario: Keeping ─────────────────────────────────────────────────────
  const monthlyRentalEst = (!isSelling)
    ? Math.round((currentPropertyValue * 0.04) / 12)
    : undefined;
  const netMonthlyCashflow = monthlyRentalEst != null
    ? monthlyRentalEst - currentMonthlyRepayment
    : undefined;

  return {
    grossEquity:          Math.round(grossEquity),
    usableEquity:         Math.round(usableEquity),
    affordableEquityDraw: Math.round(affordableEquityDraw),
    newPropertyLoan:      Math.round(newPropertyLoan),
    totalBudget:          Math.round(totalBudget),
    monthlyRepayment,
    newLvr:               Math.round(newLvr * 10) / 10,
    stampDuty:            Math.round(base),
    stampDutyPayable:     Math.round(payable),
    totalUpfront,
    netSaleProceeds,
    monthlyRentalEst,
    netMonthlyCashflow,
  };
}

// ─── Path C results ───────────────────────────────────────────────────────────

import { BEST_AVAILABLE_RATE } from "./rates";
export const REFI_MARKET_RATE = BEST_AVAILABLE_RATE;  // sourced from lib/rates.ts

export interface ResultsC {
  currentAnnualInterest:    number;
  optimisedAnnualInterest:  number;
  annualSavings:            number;
  fiveYearSavings:          number;
  loanLifeSavings:          number;
  currentLvr:               number;
  usableEquity:             number;
  offsetAnnualSaving:       number;  // from moving savings to offset
  rateAnnualSaving:         number;  // from rate improvement
}

export function calculatePathC(quiz: QuizData): ResultsC {
  const {
    currentLoanBalance = 500_000,
    currentRate        = 0.065,
    otherSavings       = 0,
    offsetBalance      = 0,
    hasOffset          = false,
    propertyValue      = 0,
  } = quiz;

  // Current annual interest
  const currentAnnualInterest = currentLoanBalance * currentRate;

  // Offset saving: if they have savings outside offset, moving them saves interest
  const totalSavingsInOffset   = hasOffset ? offsetBalance : 0;
  const savingsOutsideOffset   = otherSavings;
  const offsetAnnualSaving     = savingsOutsideOffset * currentRate;

  // Rate saving: if their rate > market average
  const rateGap         = Math.max(0, currentRate - REFI_MARKET_RATE);
  const rateAnnualSaving = currentLoanBalance * rateGap;

  // Optimised interest = current interest - both savings
  const optimisedAnnualInterest = Math.max(0, currentAnnualInterest - offsetAnnualSaving - rateAnnualSaving);

  const annualSavings    = offsetAnnualSaving + rateAnnualSaving;
  const fiveYearSavings  = annualSavings * 5;
  // Rough loan life savings (simple, not compounded)
  const loanLifeSavings  = annualSavings * LOAN_TERM_YEARS;

  const currentLvr    = propertyValue > 0 ? (currentLoanBalance / propertyValue) * 100 : 0;
  const usableEquity  = propertyValue > 0
    ? Math.max(0, propertyValue * 0.8 - currentLoanBalance)
    : 0;

  return {
    currentAnnualInterest:   Math.round(currentAnnualInterest),
    optimisedAnnualInterest: Math.round(optimisedAnnualInterest),
    annualSavings:           Math.round(annualSavings),
    fiveYearSavings:         Math.round(fiveYearSavings),
    loanLifeSavings:         Math.round(loanLifeSavings),
    currentLvr:              Math.round(currentLvr * 10) / 10,
    usableEquity:            Math.round(usableEquity),
    offsetAnnualSaving:      Math.round(offsetAnnualSaving),
    rateAnnualSaving:        Math.round(rateAnnualSaving),
  };
}

// ─── Path N results ───────────────────────────────────────────────────────────

// PMT with custom term (months)
export function pmtN(annualRate: number, principal: number, months: number): number {
  if (principal <= 0) return 0;
  if (annualRate === 0) return principal / months;
  const r = annualRate / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export interface ResultsN {
  totalEquity:          number;  // totalPropertyValue - totalLoanBalance (gross, can be 0)
  usableEquity:         number;  // (totalPropertyValue * 0.8) - totalLoanBalance (floor 0)
  affordableEquityDraw: number;  // serviceability-capped equity access = min(usableEquity, additionalBorrowing)
  additionalBorrowing:  number;  // new borrowing capacity after servicing existing debt
  maxBudget:            number;  // cashSavings + additionalBorrowing (equity is borrowed, not free cash)
  existingMonthlyRepay: number;  // PMT at MARKET_RATE 25yr on totalLoanBalance
  grossIncome:          number;
  isOverleveraged:      boolean; // usableEquity was negative (raw)
  qualified:            boolean; // maxBudget >= $500k
}

/**
 * Compute additional borrowing capacity for Path N.
 * @param quiz          Quiz answers
 * @param extraGrossMonthlyRent  Unshaded gross monthly rent from the NEW investment property
 *                               being purchased (0 for live-in or if not applicable).
 *                               80% shading is applied inside this function.
 */
export function computeAdditionalBorrowingN(
  quiz: QuizData,
  extraGrossMonthlyRent = 0,
): number {
  const {
    buyingSituation     = "solo",
    annualIncome        = 0,
    partnerIncome       = 0,
    monthlyRentalIncome = 0,
    totalLoanBalance    = 0,
    creditCardLimit     = 0,
    carLoanMonthly      = 0,
    personalLoanMonthly = 0,
    hecsDebt            = 0,
    dependants          = 0,
  } = quiz;

  // All users treated as PAYG — 100% of stated income
  const partnerGross = buyingSituation === "partner" ? partnerIncome : 0;
  // Add all rental income (existing + new property) at 80% shading to gross before tax
  const shadedRentalAnnual = (monthlyRentalIncome + extraGrossMonthlyRent) * 12 * 0.80;

  const combinedGross = annualIncome + partnerGross + shadedRentalAnnual;
  const { netIncome } = calculateTax(combinedGross);
  const monthlyNet = netIncome / 12;

  const existingRepay = Math.round(pmtN(MARKET_RATE, totalLoanBalance, 25 * 12));
  const hecsAnnual    = hecsDebt > 0 ? calculateHecsRepayment(annualIncome) : 0;
  const otherMonthly  = (creditCardLimit * 0.038) / 12
    + carLoanMonthly
    + personalLoanMonthly
    + hecsAnnual / 12;

  const hem     = getHEM(buyingSituation, dependants);
  const surplus = Math.max(0, monthlyNet - existingRepay - otherMonthly - hem);

  const assessedRate = Math.max(MARKET_RATE + 0.03, MIN_ASSESSED_RATE);
  return Math.round(pvAnnuity(assessedRate, surplus) / 1000) * 1000;
}

export function calculatePathN(quiz: QuizData): ResultsN {
  const {
    buyingSituation    = "solo",
    annualIncome       = 0,
    partnerIncome      = 0,
    totalPropertyValue = 0,
    totalLoanBalance   = 0,
    cashSavings        = 0,
  } = quiz;

  const additionalBorrowing  = computeAdditionalBorrowingN(quiz);
  const existingMonthlyRepay = Math.round(pmtN(MARKET_RATE, totalLoanBalance, 25 * 12));

  const rawEquity    = totalPropertyValue - totalLoanBalance;
  const usableEquity = Math.max(0, totalPropertyValue * 0.8 - totalLoanBalance);
  const totalEquity  = Math.max(0, rawEquity);
  const isOverleveraged = rawEquity < 0;

  const affordableEquityDraw = Math.min(usableEquity, additionalBorrowing);
  const maxBudget = cashSavings + additionalBorrowing;
  const qualified  = maxBudget >= 500_000;

  // All users treated as PAYG — 100% of stated income
  const grossIncome = annualIncome + (buyingSituation === "partner" ? partnerIncome : 0);

  return {
    totalEquity,
    usableEquity,
    affordableEquityDraw,
    additionalBorrowing,
    maxBudget,
    existingMonthlyRepay,
    grossIncome,
    isOverleveraged,
    qualified,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}
