/* ============================================================
   BORROWING POWER ENGINE — rates, brackets & HEM figures.
   These change most financial years (usually 1 July) — this file
   should be the only place that needs updating when they do.
   Currently set for FY2026-27.
   ============================================================ */

export type Bracket = { min: number; max: number | null; rate: number };

// Resident individual income tax rates, FY2026-27 (post 1 July 2026 cut: 16% -> 15%)
export const TAX_BRACKETS: Bracket[] = [
  { min: 0, max: 18200, rate: 0 },
  { min: 18200, max: 45000, rate: 0.15 },
  { min: 45000, max: 135000, rate: 0.3 },
  { min: 135000, max: 190000, rate: 0.37 },
  { min: 190000, max: null, rate: 0.45 },
];

export const MEDICARE_LEVY_RATE = 0.02;

// HECS-HELP / study & training support loan repayment thresholds, FY2026-27.
// Marginal since 1 July 2025, except the top band, which the ATO defines as a
// flat rate on total repayment income (not marginal-on-excess) — this is
// continuous with the marginal calculation at the boundary, so there's no cliff.
export const HECS_BANDS: Bracket[] = [
  { min: 0, max: 69528, rate: 0 },
  { min: 69528, max: 129717, rate: 0.15 },
  { min: 129717, max: 186050, rate: 0.17 },
  { min: 186050, max: null, rate: 0.1 },
];

// HEM-style monthly living expenses
export const HEM_SINGLE_MONTHLY = 2600;
export const HEM_COUPLE_MONTHLY = 4300;
export const HEM_PER_DEPENDANT_MONTHLY = 500;
export const HEM_SCALE_INCOME_THRESHOLD = 150000; // combined gross annual
export const HEM_SCALE_RATE = 0.32; // of combined monthly net income, when above threshold

// Monthly commitment assumed against a credit card's total limit (not balance owing)
export const CREDIT_CARD_COMMITMENT_RATE = 0.038;

// Lender assessment
export const ADVERTISED_RATE = 0.059; // 5.90% p.a. — used for displayed repayments
export const ASSESSMENT_BUFFER = 0.03; // +3.0% serviceability buffer
export const ASSESSED_RATE = ADVERTISED_RATE + ASSESSMENT_BUFFER;
export const BORROWING_CONSERVATISM_FACTOR = 0.95; // keeps the site from over-quoting vs a real lender assessment

/* ── Supplementary (non-salary) income ───────────────────────────────────
   Child support and family payments are NOT taxable income. They are added
   to net monthly income directly and must never go through the tax tables,
   and they must never inflate the taxable-income figure that drives HECS
   repayments or the Help to Buy income cap.

   Lenders shade these rather than taking them at face value, and policy
   varies a lot: most accept child support and Family Tax Benefit close to
   full value with evidence of regularity, and many stop counting FTB once
   the youngest child passes a policy age (commonly 11-13). These factors
   are the single place to tighten that if you want /start to sit closer to
   a conservative lender than a generous one.                              */
export const CHILD_SUPPORT_SHADING = 1.0;    // 100% of the stated amount
export const FAMILY_PAYMENTS_SHADING = 1.0;  // 100% — Family Tax Benefit A & B
export const OTHER_GOV_SUPPORT_SHADING = 1.0;// 100% — DSP, Carer, Age Pension

// Centrelink pays fortnightly and most people know these amounts as a
// fortnightly figure. 26 fortnights a year / 12 months.
export const FORTNIGHTS_PER_MONTH = 26 / 12;
