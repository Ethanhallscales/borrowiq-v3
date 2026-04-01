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

export function trackCompleteRegistration(params: { path: string; currency: string; value: number }) {
  fbq("track", "CompleteRegistration", params);
}

export function trackSchedule(path: string) {
  fbq("track", "Schedule", { path });
}

export function trackInitiateCheckout() {
  fbq("track", "InitiateCheckout", { value: 27, currency: "AUD" });
}

export function trackPurchase() {
  fbq("track", "Purchase", { value: 27.00, currency: "AUD" });
}

// ── Custom events ───────────────────────────────────────────────────────────

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
