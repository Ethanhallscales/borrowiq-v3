/* ============================================================
   META CONVERSIONS API  (server-only)

   Why this exists: the browser pixel used to report every completed
   calculator as a Lead, so Meta optimised for "people who finish forms"
   rather than "people who can actually buy". Qualification is known at
   submit time, so the server is the honest place to report it.

   THREE EVENTS, deliberately different jobs:

     CalcSubmit           — custom, EVERY submission. Volume/reporting only.
                            Also fired in the browser with the same event_id,
                            so Meta dedupes the pair into one event. Custom
                            on purpose: an ad set must never be able to
                            optimise for "finished the form".

     CompleteRegistration — standard, QUALIFIED ONLY, server-side only.
                            The live ad set already optimises for this, so
                            keeping the name means no ad-set change and no
                            learning reset — it simply stops counting the
                            unqualified.

     Lead                 — standard, QUALIFIED ONLY, server-side only.
                            Runs alongside so the ad set can be switched to
                            Lead, or to value optimisation, without any
                            re-instrumentation.

   Both conversion events carry value = lead score, currency AUD.

   NOTHING here may block or fail the submit response or the GHL webhook.
   Every path swallows its errors and logs the event name and HTTP status
   only — never the access token, never raw PII.
   ============================================================ */

import { createHash } from "node:crypto";

const GRAPH_VERSION = "v21.0";
const TIMEOUT_MS = 3000;

/* Lead score tiers — the ONE place the thresholds live.
   Ordered high to low; the first tier the price clears wins. */
export const LEAD_SCORE_TIERS = [
  { minPurchasePrice: 700_000, score: 3 },
  { minPurchasePrice: 600_000, score: 2 },
  { minPurchasePrice: 500_000, score: 1 },
] as const;

export type LeadScore = 1 | 2 | 3;

/**
 * Lead strength from the Help to Buy max purchase price.
 *
 * Returns null for an unqualified submission — no Lead event is sent and
 * no score goes to Meta or GHL. Callers treat null as "Lead suppressed".
 */
export function scoreLead(result: {
  qualified: boolean;
  maxPurchasePrice: number;
}): LeadScore | null {
  if (!result.qualified) return null;
  for (const tier of LEAD_SCORE_TIERS) {
    if (result.maxPurchasePrice >= tier.minPurchasePrice) return tier.score;
  }
  /* Qualified but under the lowest tier. Can't happen while the qualify
     floor and the bottom tier are both $500k, but if either moves, a
     qualified lead still reports as the weakest tier rather than vanishing. */
  return 1;
}

/* ── normalisation + hashing ───────────────────────────────────────────────
   Meta matches on SHA-256 of a NORMALISED value. Normalise wrong and the
   hash simply never matches anyone — it fails silently, which is why each
   rule below is spelled out rather than inlined. */

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const normaliseEmail = (v: string) => v.trim().toLowerCase();

/** Lowercase, trimmed, punctuation stripped. Keeps letters (incl. accented)
    and internal spaces — "O'Brien" and "Smith-Jones" both have to land on
    the same hash Meta computed from the same rules. */
const normaliseName = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * AU phone → E.164 digits, no leading "+".
 *   "0412 345 678"    → 61412345678
 *   "(02) 9876 5432"  → 61298765432
 *   "+61 412 345 678" → 61412345678
 *   "412345678"       → 61412345678  (9 digits, national form minus the 0)
 * Anything already starting 61 is left alone.
 */
function normalisePhoneAu(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("61")) return digits;
  if (digits.startsWith("0")) return `61${digits.slice(1)}`;
  if (digits.length === 9) return `61${digits}`;
  return digits;
}

/** AU postcodes are 4 digits and must stay a string — "0800" is not 800. */
function normalisePostcode(v: string): string {
  const digits = v.replace(/\D/g, "");
  return digits.length === 4 ? digits : "";
}

export type MetaUserData = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  postcode?: string;
  /** Hashed before sending. The submission id, not an email or phone. */
  externalId?: string;
  /** Sent UNHASHED — Meta requires these in the clear. */
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
};

/** No PII in here, ever. Aggregate/categorical values only. */
export type MetaCustomData = Record<string, string | number | boolean>;

function buildUserData(u: MetaUserData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};

  const hashed: Array<[string, string | undefined, (v: string) => string]> = [
    ["em", u.email, normaliseEmail],
    ["ph", u.phone, normalisePhoneAu],
    ["fn", u.firstName, normaliseName],
    ["ln", u.lastName, normaliseName],
    ["zp", u.postcode, normalisePostcode],
    ["external_id", u.externalId, (v) => v.trim()],
  ];

  for (const [key, raw, normalise] of hashed) {
    if (!raw) continue;
    const normalised = normalise(raw);
    if (normalised) out[key] = sha256(normalised);
  }

  /* Unhashed by Meta's spec. fbc/fbp are the strongest match signals we
     have for paid traffic — they tie the event back to the actual ad click. */
  if (u.clientIpAddress) out.client_ip_address = u.clientIpAddress;
  if (u.clientUserAgent) out.client_user_agent = u.clientUserAgent;
  if (u.fbc) out.fbc = u.fbc;
  if (u.fbp) out.fbp = u.fbp;

  return out;
}

export type SendMetaEventArgs = {
  eventName: string;
  /** Must match the browser event's eventID for CalcSubmit to dedupe. */
  eventId: string;
  /** Unix SECONDS. Defaults to now. */
  eventTime?: number;
  eventSourceUrl?: string;
  userData: MetaUserData;
  customData?: MetaCustomData;
};

/**
 * Fire one server-side event. Resolves to true only on a 2xx from Meta.
 *
 * Never throws and never rejects: a Meta outage must not cost us a lead.
 */
export async function sendMetaEvent({
  eventName,
  eventId,
  eventTime,
  eventSourceUrl,
  userData,
  customData,
}: SendMetaEventArgs): Promise<boolean> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn(`[meta-capi] ${eventName} skipped: pixel id or access token not configured`);
    return false;
  }

  const event: Record<string, unknown> = {
    event_name: eventName,
    event_id: eventId,
    event_time: eventTime ?? Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: buildUserData(userData),
  };
  if (eventSourceUrl) event.event_source_url = eventSourceUrl;
  if (customData && Object.keys(customData).length > 0) event.custom_data = customData;

  const body: Record<string, unknown> = { data: [event], access_token: accessToken };

  /* Present only while testing. With it set, events land in the Test Events
     tab instead of counting as live conversions — so it must stay unset in
     production or the ad set sees nothing. */
  const testEventCode = process.env.META_TEST_EVENT_CODE;
  if (testEventCode) body.test_event_code = testEventCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    if (!res.ok) {
      /* Status only. The response body can echo back the payload, PII and
         all, so it never reaches the logs. */
      console.error(`[meta-capi] ${eventName} failed: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    /* Timeout or network. Name the error type, nothing from the payload. */
    const reason = err instanceof Error ? err.name : "unknown";
    console.error(`[meta-capi] ${eventName} failed: ${reason}`);
    return false;
  }
}
