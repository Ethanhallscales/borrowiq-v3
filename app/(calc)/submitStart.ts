/* ============================================================
   PRIMARY SUBMIT HANDLER  (site root)

   Builds the GoHighLevel payload and posts it to /api/submit, which
   forwards to the SAME GHL_WEBHOOK_URL endpoint the preserved v1 funnel
   uses via /v1/api/submit.

   FIELD CONTRACT: every key the v1 calculator sends is reproduced here
   unchanged, with the same name, meaning and format. Everything this
   funnel collects or calculates on top of that is added as a NEW key.
   Nothing existing is renamed or dropped.

   ROUTING: GHL tells the two funnels apart on `source`, never on the
   path — this one sends "borrowiq-start", v1 sends "borrowiq". The
   outbound GHL URL is an env var and is shared by both.
   ============================================================ */

import type { CalcResult, Mode, QualifiedReason } from "@/lib/start/startCalc";
import { STATE_NAMES } from "@/lib/start/locationCaps";

export const START_SUBMIT_ENDPOINT = "/api/submit";

export type StartAnswers = {
  applicant_type: "single" | "joint";
  dependants: number;
  first_home_buyer: boolean;
  home_type: "new" | "existing" | null;
  income_1: number;
  income_2: number;
  /* all monthly, already converted from whatever period the user picked */
  child_support_monthly: number;
  family_payments_monthly: number;
  other_gov_support_monthly: number;
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
  last_name: string;
  email: string;
  phone: string;
  mode_at_submit: Mode;
  started_at: number | null;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  /* Meta's own ad-level parameters, captured from the landing URL. */
  utm_adset: string;
  utm_ad: string;
  fbclid: string;
};

export type StartPayload = Record<string, string | number>;

const r = (n: number | undefined | null) => Math.round(n || 0);
const pct = (n: number | undefined | null) => Math.round((n || 0) * 1000) / 10;

export function buildStartPayload(a: StartAnswers, calc: CalcResult): StartPayload {
  const htb = calc.htb;
  const fhg = calc.fhg;
  const qualified: boolean = calc.qualified;
  const reason: QualifiedReason = calc.qualifiedReason;
  const scheme = a.mode_at_submit === "htb" ? htb : fhg;

  const payload: StartPayload = {
    /* ══ EXISTING FIELDS — identical keys, meaning and format to the
          live calculator's payload in app/api/submit/route.ts ══════ */
    firstName: a.first_name.trim(),
    lastName: a.last_name.trim(),
    email: a.email.trim(),
    phone: a.phone.trim(),
    source: "borrowiq-start",
    timestamp: new Date().toISOString(),
    path: "first_home_buyer",
    tags: ["BORROWIQ-LEAD", "FHB", qualified ? "QUALIFIED" : "NURTURE", a.state].join(","),

    borrowiq_qualified: qualified ? "yes" : "no",
    borrowiq_income: r(a.income_1),
    borrowiq_partner_income: a.applicant_type === "joint" ? r(a.income_2) : 0,
    borrowiq_credit_card_limit: r(a.credit_card_limits),
    // /start collects one combined car + personal figure. It goes in the car
    // field so the existing key keeps a real value, and the personal field
    // stays 0 rather than double-counting.
    borrowiq_car_loan_monthly: r(a.other_loan_repayments_monthly),
    borrowiq_personal_loan_monthly: 0,
    borrowiq_hecs_debt: r(a.hecs_balance),
    borrowiq_dependants: r(a.dependants),
    borrowiq_deposit: r(a.deposit),
    borrowiq_state: a.state,
    borrowiq_buying_situation: a.applicant_type === "joint" ? "partner" : "solo",
    borrowiq_property_type: a.home_type ?? "",
    borrowiq_borrowing_capacity: r(calc.borrowingCapacity),
    borrowiq_max_property: r(calc.buyingAloneMax),
    borrowiq_monthly_repayment: r(scheme?.monthlyRepayment),
    borrowiq_lvr:
      scheme && scheme.maxPrice > 0 ? Math.round((scheme.loan / scheme.maxPrice) * 1000) / 10 : 0,
    borrowiq_grants_eligible: [
      (htb?.grant ?? 0) > 0 ? "FHOG" : null,
      (htb?.dutySaved ?? 0) > 0 ? "STAMP-DUTY" : null,
      (htb?.govShare ?? 0) > 0 ? "HELP-TO-BUY" : null,
      (fhg?.maxPrice ?? 0) > 0 ? "FHG" : null,
    ]
      .filter(Boolean)
      .join(",") || "none",
    borrowiq_utm_source: a.utm_source,
    borrowiq_utm_medium: a.utm_medium,
    borrowiq_utm_campaign: a.utm_campaign,
    borrowiq_utm_content: a.utm_content,

    /* ══ ATTRIBUTION — standard UTM names ════════════════════════════
       GHL and the ad platforms both expect the plain utm_* names, so the
       same values go out again unprefixed. The borrowiq_utm_* keys above
       stay exactly as they are — existing GHL workflows read those.

       utm_term carries the ad set and utm_content the ad, which is how
       Meta's URL builder lays them out. utm_content falls back to the
       landing URL's own utm_content when no utm_ad is present, so traffic
       tagged with plain UTMs still reports an ad-level value. */
    utm_source: a.utm_source,
    utm_medium: a.utm_medium,
    utm_campaign: a.utm_campaign,
    utm_term: a.utm_adset,
    utm_content: a.utm_ad || a.utm_content,
    fbclid: a.fbclid,

    /* ══ NEW FIELDS — create matching custom fields in GHL ═══════════ */

    /* qualification detail */
    borrowiq_qualified_reason: reason,

    /* location */
    borrowiq_postcode: a.postcode ?? "",
    borrowiq_suburb: a.suburb ?? "",
    borrowiq_state_name: STATE_NAMES[a.state] ?? "",
    borrowiq_region: a.region,
    borrowiq_location_intent: a.location_intent,

    /* debts detail */
    borrowiq_other_loan_repayments_monthly: r(a.other_loan_repayments_monthly),
    borrowiq_has_credit_cards: (a.credit_card_limits || 0) > 0 ? "yes" : "no",
    borrowiq_has_hecs: (a.hecs_balance || 0) > 0 ? "yes" : "no",
    borrowiq_has_other_loans: (a.other_loan_repayments_monthly || 0) > 0 ? "yes" : "no",

    /* supplementary income — monthly, non-taxable, counted towards
       serviceability but deliberately outside borrowiq_combined_income */
    borrowiq_child_support_monthly: r(a.child_support_monthly),
    borrowiq_family_payments_monthly: r(a.family_payments_monthly),
    borrowiq_other_gov_support_monthly: r(a.other_gov_support_monthly),
    borrowiq_supplementary_income_monthly: r(calc.supplementaryMonthly),
    borrowiq_has_supplementary_income: calc.supplementaryMonthly > 0 ? "yes" : "no",

    /* serviceability detail */
    borrowiq_combined_income: r(calc.combinedIncome),
    borrowiq_salary_monthly_net: r(calc.salaryMonthlyNet),
    borrowiq_combined_monthly_net_income: r(calc.combinedMonthlyNet),
    borrowiq_living_expenses_monthly: r(calc.livingExpenses),
    borrowiq_total_commitments_monthly: r(calc.totalCommitments),
    borrowiq_monthly_surplus: r(calc.monthlySurplus),

    /* Help to Buy — Government Shared Equity */
    borrowiq_htb_max_price: r(htb?.maxPrice),
    borrowiq_htb_deposit_used: r(htb?.depositRequired),
    borrowiq_htb_min_deposit: r(htb?.minDeposit),
    borrowiq_htb_gov_contribution: r(htb?.govShare),
    borrowiq_htb_gov_pct: pct(htb?.govPct),
    borrowiq_htb_loan_amount: r(htb?.loan),
    borrowiq_htb_monthly_repayment: r(htb?.monthlyRepayment),
    borrowiq_htb_price_cap: r(htb?.priceCap),
    borrowiq_htb_capped_by_area: htb?.cappedByArea ? "yes" : "no",
    borrowiq_htb_stamp_duty_saved: r(htb?.dutySaved),
    borrowiq_htb_first_home_owner_grant: r(htb?.grant),

    /* First Home Guarantee */
    borrowiq_fhg_max_price: r(fhg?.maxPrice),
    borrowiq_fhg_deposit_used: r(fhg?.depositRequired),
    borrowiq_fhg_min_deposit: r(fhg?.minDeposit),
    borrowiq_fhg_loan_amount: r(fhg?.loan),
    borrowiq_fhg_monthly_repayment: r(fhg?.monthlyRepayment),
    borrowiq_fhg_price_cap: r(fhg?.priceCap),
    borrowiq_fhg_capped_by_area: fhg?.cappedByArea ? "yes" : "no",
    borrowiq_fhg_stamp_duty_saved: r(fhg?.dutySaved),
    borrowiq_fhg_first_home_owner_grant: r(fhg?.grant),

    /* scheme / session meta */
    borrowiq_mode_at_submit: a.mode_at_submit,
    borrowiq_home_type: a.home_type ?? "",
    borrowiq_first_home_buyer: a.first_home_buyer ? "yes" : "no",
    borrowiq_applicant_type: a.applicant_type,
    borrowiq_income_cap: r(calc.incomeCap),
    borrowiq_income_cap_exceeded: calc.incomeOverCap ? "yes" : "no",
    borrowiq_time_to_complete_seconds: a.started_at
      ? Math.round((Date.now() - a.started_at) / 1000)
      : 0,
  };

  return payload;
}

/**
 * Single exit point for the lead. Failure is non-blocking by design — the
 * user still sees their results even if the CRM is unreachable.
 */
export async function submitStart(payload: StartPayload): Promise<void> {
  try {
    await fetch(START_SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    /* swallowed — never block the results screen on a webhook */
  }
}
