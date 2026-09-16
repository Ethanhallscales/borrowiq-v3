/**
 * Meta Pixel helper — safe to call server-side (no-ops) or before the pixel loads.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(...args);
  }
}

// ── Standard events ─────────────────────────────────────────────────────────

export function trackViewContent(contentName: string) {
  fbq("track", "ViewContent", { content_name: contentName });
}

/* BROWSER-side CompleteRegistration is v1 funnel ONLY (app/v1).
   The root calculator fires NO browser conversion event: it sends
   CompleteRegistration from the SERVER, for qualified leads only.
   See lib/meta-capi.ts. */
export function trackCompleteRegistration(params: { path: string; currency: string; value: number }) {
  fbq("track", "CompleteRegistration", params);
}

export function trackSchedule(path: string) {
  fbq("track", "Schedule", { path });
}

export function trackScheduleConfirmed() {
  fbq("track", "Schedule", { content_name: "booking_confirmed" });
}

export function trackInitiateCheckout() {
  fbq("track", "InitiateCheckout", { value: 27, currency: "AUD" });
}

export function trackPurchase() {
  fbq("track", "Purchase", { value: 27.00, currency: "AUD" });
}

// ── Custom events ───────────────────────────────────────────────────────────

/**
 * The root calculator's ONLY browser-side submit event.
 *
 * Custom, not standard: it fires for every completed calculator, qualified
 * or not, so it must never be something an ad set can optimise for. The
 * server sends the same event with the same `eventID` and Meta collapses
 * the pair into one — see lib/meta-capi.ts.
 *
 * The conversion events (CompleteRegistration and Lead) are sent
 * SERVER-SIDE ONLY, for qualified submissions only. Do not add a browser
 * `fbq('track', ...)` conversion to the calculator flow: it would report
 * every submission as a conversion again, which is the exact problem this
 * replaced — Meta would go back to optimising for people who fill in
 * forms rather than people who can actually buy.
 */
export function trackCalcSubmit(eventId: string) {
  fbq("trackCustom", "CalcSubmit", {}, { eventID: eventId });
}

export function trackPathSelected(path: string) {
  fbq("trackCustom", "PathSelected", { path });
}

export function trackFHBResults(qualified: boolean) {
  fbq("trackCustom", "FHB_Results", { qualified });
}

export function trackNHResults(qualified: boolean) {
  fbq("trackCustom", "NH_Results", { qualified });
}

export function trackRFResults() {
  fbq("trackCustom", "RF_Results");
}
