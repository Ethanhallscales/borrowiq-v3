/* ============================================================
   /start SUBMIT HANDLER
   Deliberately isolated from the form and the calc engine: it takes
   the raw answers + the calc result, flattens everything into ONE
   snake_case JSON object, and (for now) logs it.

   TO CONNECT A WEBHOOK LATER: the only edit needed is inside
   submitStart() — post `payload` to the endpoint. Nothing in the
   form, the steps or lib/start/startCalc.ts has to change.
   ============================================================ */

import type { CalcResult, Mode } from "@/lib/start/startCalc";
import { STATE_NAMES } from "@/lib/start/locationCaps";

export type StartAnswers = {
  applicant_type: "single" | "joint";
  dependants: number;
  first_home_buyer: boolean;
  home_type: "new" | "existing" | null;
  income_1: number;
  income_2: number;
  deposit: number;
  credit_card_limits: number;
  hecs_balance: number;
  other_loan_repayments_monthly: number;
  suburb: string | null;
  postcode: string | null;
  state: string;
  region: "capital_regional" | "rest_of_state";
  location_intent: "resolved" | "undecided";
  first_name: string;
  email: string;
  phone: string;
  mode_at_submit: Mode;
  started_at: number | null;
};

export type StartPayload = Record<string, string | number | boolean | null>;

const r = (n: number | undefined | null) => Math.round(n || 0);
const pct = (n: number | undefined | null) => Math.round((n || 0) * 1000) / 10;

/** Flattens every input and every calculated output into one flat object. */
export function buildStartPayload(a: StartAnswers, calc: CalcResult): StartPayload {
  const htb = calc.htb;
  const fhg = calc.fhg;

  return {
    /* ── meta ─────────────────────────────────────────────── */
    source: "borrowiq-start-calc",
    submitted_at: new Date().toISOString(),
    time_to_complete_seconds: a.started_at ? Math.round((Date.now() - a.started_at) / 1000) : 0,
    mode_at_submit: a.mode_at_submit,

    /* ── contact ──────────────────────────────────────────── */
    first_name: a.first_name.trim(),
    email: a.email.trim(),
    phone: a.phone.trim(),

    /* ── inputs: household ────────────────────────────────── */
    applicant_type: a.applicant_type,
    dependants: a.dependants,
    first_home_buyer: a.first_home_buyer,
    home_type: a.home_type,

    /* ── inputs: money ────────────────────────────────────── */
    income_1: r(a.income_1),
    income_2: a.applicant_type === "joint" ? r(a.income_2) : 0,
    combined_income: r(calc.combinedIncome),
    deposit: r(a.deposit),

    /* ── inputs: debts ────────────────────────────────────── */
    credit_card_limits: r(a.credit_card_limits),
    has_credit_cards: (a.credit_card_limits || 0) > 0,
    hecs_balance: r(a.hecs_balance),
    has_hecs: (a.hecs_balance || 0) > 0,
    other_loan_repayments_monthly: r(a.other_loan_repayments_monthly),
    has_other_loans: (a.other_loan_repayments_monthly || 0) > 0,

    /* ── inputs: location ─────────────────────────────────── */
    suburb: a.suburb,
    postcode: a.postcode,
    state: a.state,
    state_name: STATE_NAMES[a.state] ?? null,
    region: a.region,
    location_intent: a.location_intent,

    /* ── outputs: serviceability ──────────────────────────── */
    combined_monthly_net_income: r(calc.combinedMonthlyNet),
    living_expenses_monthly: r(calc.livingExpenses),
    credit_card_commitment_monthly: r(calc.creditCardMonthly),
    hecs_repayment_monthly: r(calc.hecsMonthly),
    other_loans_commitment_monthly: r(calc.otherLoansMonthly),
    total_commitments_monthly: r(calc.totalCommitments),
    monthly_surplus: r(calc.monthlySurplus),
    borrowing_capacity: r(calc.borrowingCapacity),
    buying_alone_max_price: r(calc.buyingAloneMax),

    /* ── outputs: Help to Buy (2% + government share) ─────── */
    htb_max_purchase_price: r(htb?.maxPrice),
    htb_deposit_required: r(htb?.depositRequired),
    htb_gov_contribution: r(htb?.govShare),
    htb_gov_contribution_pct: pct(htb?.govPct),
    htb_loan_amount: r(htb?.loan),
    htb_monthly_repayment: r(htb?.monthlyRepayment),
    htb_price_cap: r(htb?.priceCap),
    htb_capped_by_area: !!htb?.cappedByArea,
    htb_stamp_duty_saved: r(htb?.dutySaved),
    htb_first_home_owner_grant: r(htb?.grant),
    htb_total_support: r(htb?.totalSupport),

    /* ── outputs: 5% Deposit Scheme (First Home Guarantee) ── */
    fhg_max_purchase_price: r(fhg?.maxPrice),
    fhg_deposit_required: r(fhg?.depositRequired),
    fhg_loan_amount: r(fhg?.loan),
    fhg_monthly_repayment: r(fhg?.monthlyRepayment),
    fhg_price_cap: r(fhg?.priceCap),
    fhg_capped_by_area: !!fhg?.cappedByArea,
    fhg_stamp_duty_saved: r(fhg?.dutySaved),
    fhg_first_home_owner_grant: r(fhg?.grant),
    fhg_total_support: r(fhg?.totalSupport),

    /* ── soft flags (never used to block anyone) ──────────── */
    help_to_buy_income_cap: r(calc.incomeCap),
    help_to_buy_income_cap_exceeded: calc.incomeOverCap,
    needs_manual_confirmation: calc.incomeOverCap,
  };
}

/**
 * Single exit point for the lead. Currently console-only — no webhook, no CRM.
 * Drop the fetch in here when the endpoint exists; the signature stays the same.
 */
export async function submitStart(payload: StartPayload): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("[/start] lead payload", payload);
  // eslint-disable-next-line no-console
  console.log("[/start] lead payload (JSON)", JSON.stringify(payload, null, 2));

  // --- WEBHOOK DROP-IN POINT -------------------------------------------
  // await fetch(process.env.NEXT_PUBLIC_START_WEBHOOK_URL!, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // });
  // ---------------------------------------------------------------------
}
