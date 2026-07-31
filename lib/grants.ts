/**
 * Australian government grant eligibility data.
 * All caps and amounts are stored here — editable for admin panel later.
 */

import type { AustralianState, QuizData } from "./types";

export type EligibilityStatus = "eligible" | "not-eligible" | "maybe";

export interface GrantResult {
  id:          string;
  name:        string;
  shortName:   string;
  cashValue:   number;    // $0 if non-cash benefit
  status:      EligibilityStatus;
  reason:      string;    // one-line explanation
  detail?:     string;    // extra context
}

// ─── FHOG amounts by state ────────────────────────────────────────────────────
// Only payable on new builds (unless state-specific exception)

export const FHOG_AMOUNTS: Record<AustralianState, { amount: number; maxPrice: number; newBuildOnly: boolean }> = {
  QLD: { amount: 30_000, maxPrice: 750_000, newBuildOnly: true  },
  NSW: { amount: 10_000, maxPrice: 750_000, newBuildOnly: true  },
  VIC: { amount: 10_000, maxPrice: 750_000, newBuildOnly: true  },
  WA:  { amount: 10_000, maxPrice: 750_000, newBuildOnly: true  },
  SA:  { amount: 15_000, maxPrice: 650_000, newBuildOnly: true  },
  TAS: { amount: 30_000, maxPrice: 0,       newBuildOnly: true  }, // no price cap
  ACT: { amount: 0,      maxPrice: 0,       newBuildOnly: false }, // ACT no FHOG
  NT:  { amount: 10_000, maxPrice: 0,       newBuildOnly: true  }, // no price cap
};

// ─── First Home Guarantee (Housing Australia, from 1 Oct 2025) ────────────────
// No income caps. No place limits. Available to Australian citizens/PRs who are
// first home buyers or have not owned property in the last 10 years.
// Property price caps by state (October 2025 figures):

export const FHG_PRICE_CAPS: Record<AustralianState, number> = {
  QLD: 1_000_000,   // Brisbane, Gold Coast, Sunshine Coast
  NSW: 1_500_000,   // Sydney
  VIC:   950_000,   // Melbourne, Geelong
  WA:    850_000,   // Perth
  SA:    900_000,   // Adelaide
  TAS:   700_000,
  ACT:   900_000,
  NT:    700_000,
};
export const FHG_MIN_DEPOSIT   = 0.05;   // 5%

// ─── Family Home Guarantee (from 1 Oct 2025) ─────────────────────────────────
// No income caps. Single parents or eligible single guardians with at least one
// dependant. 2% minimum deposit, LMI waived.

export const FAM_HG_MIN_DEPOSIT  = 0.02;   // 2%
// Price caps same as FHG

// ─── Help to Buy (federal shared equity scheme) ──────────────────────────────
// Government contributes up to 30% of the purchase price (established homes)
// and buyer needs just a 2% deposit. Income-tested.

export const HELP_TO_BUY_MIN_DEPOSIT       = 0.02;      // 2%
export const HELP_TO_BUY_GOV_PCT           = 0.30;      // up to 30%
export const HELP_TO_BUY_INCOME_CAP_SINGLE = 106_000;
export const HELP_TO_BUY_INCOME_CAP_JOINT  = 160_000;   // couples & single parents

// ─── FHSS ────────────────────────────────────────────────────────────────────
export const FHSS_MAX = 50_000;

// ─── Grant checker ───────────────────────────────────────────────────────────

export function calculateGrants(quiz: QuizData, totalIncome: number): GrantResult[] {
  const {
    state = "QLD", propertyType, buyingSituation,
    deposit = 0, annualIncome = 0, partnerIncome = 0,
  } = quiz;

  const isNewBuild   = propertyType === "land";      // land+build or house and land
  const isSingleParent = buyingSituation === "single-parent";
  const isPartner    = buyingSituation === "partner";
  const combinedIncome = totalIncome;
  const fhgCap       = FHG_PRICE_CAPS[state];

  // Estimate property price from deposit + rough borrowing (we'll use 80% LVR estimate)
  const estimatedPrice = deposit > 0 ? deposit / 0.10 : 500_000; // rough 10% deposit assumption

  const results: GrantResult[] = [];

  // ── FHOG ─────────────────────────────────────────────────────────────────
  const fhog = FHOG_AMOUNTS[state];
  if (fhog.amount === 0) {
    results.push({
      id: "fhog", name: "First Home Owner Grant", shortName: "FHOG",
      cashValue: 0, status: "not-eligible",
      reason: `${state} does not offer the FHOG.`,
    });
  } else if (!isNewBuild) {
    results.push({
      id: "fhog", name: "First Home Owner Grant", shortName: `FHOG ${state}`,
      cashValue: 0, status: "not-eligible",
      reason: `The ${state} FHOG ($${fhog.amount.toLocaleString()}) applies to new builds only.`,
      detail: "If you're buying land to build, or a newly built home, you may qualify.",
    });
  } else if (fhog.maxPrice > 0 && estimatedPrice > fhog.maxPrice) {
    results.push({
      id: "fhog", name: "First Home Owner Grant", shortName: `FHOG ${state}`,
      cashValue: 0, status: "not-eligible",
      reason: `Property price exceeds the $${(fhog.maxPrice/1000).toFixed(0)}k FHOG cap.`,
    });
  } else {
    results.push({
      id: "fhog", name: "First Home Owner Grant", shortName: `FHOG ${state}`,
      cashValue: fhog.amount, status: "eligible",
      reason: `Cash grant of $${fhog.amount.toLocaleString()} for new builds in ${state}.`,
    });
  }

  // ── First Home Guarantee (from 1 Oct 2025 — no income caps) ────────────
  const hasMinDep  = deposit / estimatedPrice >= FHG_MIN_DEPOSIT;
  const fhgPricOk  = estimatedPrice <= fhgCap;

  if (isSingleParent) {
    // single parents use Family Home Guarantee (below), not FHG
    results.push({
      id: "fhg", name: "First Home Guarantee", shortName: "FHG",
      cashValue: 0, status: "not-eligible",
      reason: "As a single parent you qualify for the superior Family Home Guarantee instead.",
    });
  } else if (hasMinDep && fhgPricOk) {
    results.push({
      id: "fhg", name: "First Home Guarantee", shortName: "FHG",
      cashValue: 0, status: "eligible",
      reason: `LMI waived — buy with as little as 5% deposit (saves $8k–$20k+ in LMI).`,
      detail: "Government guarantees up to 15% so you avoid Lenders Mortgage Insurance. No income limits apply.",
    });
  } else {
    const reasons = [];
    if (!hasMinDep)   reasons.push("deposit below 5%");
    if (!fhgPricOk)   reasons.push(`property exceeds ${`$${(fhgCap/1000).toFixed(0)}k`} cap`);
    results.push({
      id: "fhg", name: "First Home Guarantee", shortName: "FHG",
      cashValue: 0, status: "not-eligible",
      reason: `Not eligible: ${reasons.join(", ")}.`,
    });
  }

  // ── Family Home Guarantee (from 1 Oct 2025 — no income caps) ─────────
  if (isSingleParent && fhgPricOk) {
    results.push({
      id: "fam-hg", name: "Family Home Guarantee", shortName: "FHG Family",
      cashValue: 0, status: "eligible",
      reason: "Buy with just 2% deposit — LMI waived. For single parents with at least one dependant.",
      detail: "Government guarantees up to 18% of the property value. No income limits apply.",
    });
  } else if (!isSingleParent) {
    results.push({
      id: "fam-hg", name: "Family Home Guarantee", shortName: "FHG Family",
      cashValue: 0, status: "not-eligible",
      reason: "This scheme is for single parents or eligible single guardians with at least one dependant.",
    });
  } else {
    results.push({
      id: "fam-hg", name: "Family Home Guarantee", shortName: "FHG Family",
      cashValue: 0, status: "not-eligible",
      reason: `Property price exceeds ${`$${(fhgCap/1000).toFixed(0)}k`} cap.`,
    });
  }

  // ── FHSS ─────────────────────────────────────────────────────────────────
  results.push({
    id: "fhss", name: "First Home Super Saver", shortName: "FHSS",
    cashValue: FHSS_MAX, status: "maybe",
    reason: `Withdraw up to $50,000 in voluntary super contributions for your deposit.`,
    detail: "Eligibility depends on whether you've made voluntary contributions. Speak to your super fund.",
  });

  // ── Stamp Duty Concession note ────────────────────────────────────────────
  results.push({
    id: "stamp-duty", name: "Stamp Duty Concession", shortName: "Duty Waiver",
    cashValue: 0, status: estimatedPrice <= fhgCap ? "eligible" : "maybe",
    reason: state === "QLD" && estimatedPrice <= 700_000
      ? "QLD first home buyers pay $0 stamp duty on homes under $700k."
      : "Concession may apply depending on property price. See breakdown below.",
  });

  return results;
}

export function totalGrantCash(grants: GrantResult[]): number {
  return grants
    .filter(g => g.status === "eligible")
    .reduce((sum, g) => sum + g.cashValue, 0);
}
