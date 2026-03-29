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

// ─── First Home Guarantee (NHFIC) ─────────────────────────────────────────────
// Property price caps by state (2024–25)

export const FHG_PRICE_CAPS: Record<AustralianState, number> = {
  NSW: 900_000, VIC: 800_000, QLD: 700_000, WA: 600_000,
  SA:  600_000, TAS: 550_000, ACT: 750_000, NT: 600_000,
};
export const FHG_INCOME_SINGLE = 125_000;
export const FHG_INCOME_COUPLE = 200_000;
export const FHG_MIN_DEPOSIT   = 0.05;   // 5%

// ─── Family Home Guarantee ────────────────────────────────────────────────────

export const FAM_HG_INCOME_CAP   = 125_000;
export const FAM_HG_MIN_DEPOSIT  = 0.02;   // 2%
// Price caps same as FHG

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

  // ── First Home Guarantee ──────────────────────────────────────────────────
  const fhgIncCap  = isPartner ? FHG_INCOME_COUPLE : FHG_INCOME_SINGLE;
  const hasMinDep  = deposit / estimatedPrice >= FHG_MIN_DEPOSIT;
  const fhgPricOk  = estimatedPrice <= fhgCap;
  const fhgIncomeOk = combinedIncome <= fhgIncCap;

  if (isSingleParent) {
    // single parents use Family Home Guarantee (below), not FHG
    results.push({
      id: "fhg", name: "First Home Guarantee", shortName: "FHG",
      cashValue: 0, status: "not-eligible",
      reason: "As a single parent you qualify for the superior Family Home Guarantee instead.",
    });
  } else if (fhgIncomeOk && hasMinDep && fhgPricOk) {
    results.push({
      id: "fhg", name: "First Home Guarantee", shortName: "FHG",
      cashValue: 0, status: "eligible",
      reason: `LMI waived — buy with as little as 5% deposit (saves $8k–$20k+ in LMI).`,
      detail: "Government guarantees up to 15% so you avoid Lenders Mortgage Insurance.",
    });
  } else {
    const reasons = [];
    if (!fhgIncomeOk) reasons.push(`income exceeds $${(fhgIncCap/1000).toFixed(0)}k cap`);
    if (!hasMinDep)   reasons.push("deposit below 5%");
    if (!fhgPricOk)   reasons.push(`property exceeds $${(fhgCap/1000).toFixed(0)}k cap`);
    results.push({
      id: "fhg", name: "First Home Guarantee", shortName: "FHG",
      cashValue: 0, status: "not-eligible",
      reason: `Not eligible: ${reasons.join(", ")}.`,
    });
  }

  // ── Family Home Guarantee ─────────────────────────────────────────────────
  if (isSingleParent && combinedIncome <= FAM_HG_INCOME_CAP && fhgPricOk) {
    results.push({
      id: "fam-hg", name: "Family Home Guarantee", shortName: "FHG Family",
      cashValue: 0, status: "eligible",
      reason: "Buy with just 2% deposit — LMI waived. Designed for single parents.",
      detail: "Government guarantees up to 18% of the property value.",
    });
  } else if (!isSingleParent) {
    results.push({
      id: "fam-hg", name: "Family Home Guarantee", shortName: "FHG Family",
      cashValue: 0, status: "not-eligible",
      reason: "This scheme is for single parents or eligible single guardians only.",
    });
  } else {
    results.push({
      id: "fam-hg", name: "Family Home Guarantee", shortName: "FHG Family",
      cashValue: 0, status: "not-eligible",
      reason: combinedIncome > FAM_HG_INCOME_CAP
        ? `Income exceeds $${(FAM_HG_INCOME_CAP/1000).toFixed(0)}k cap.`
        : `Property price exceeds $${(fhgCap/1000).toFixed(0)}k cap.`,
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
