/* ============================================================
   PRIMARY SUBMIT ROUTE  →  POST /api/submit

   Serves the live calculator at the site root (app/(calc)). Forwards the
   lead to GoHighLevel at process.env.GHL_WEBHOOK_URL — the SAME endpoint
   the preserved v1 funnel uses via /v1/api/submit.

   The two funnels are told apart in GHL by the `source` field, never by
   the path: this one sends source="borrowiq-start", v1 sends "borrowiq".
   Both are stable identifiers — do not rename them without updating the
   matching GHL workflows.

   The payload itself is built client-side in app/(calc)/submitStart.ts,
   which holds the field contract.

   It also reports the submission to Meta's Conversions API, AFTER the GHL
   webhook and after the response has been flushed. See lib/meta-capi.ts
   for which events fire and why.
   ============================================================ */

import { after } from "next/server";
import type { QuizData } from "@/lib/types";
import { buildAndSend } from "@/app/v1/api/submit/route";
import { scoreLead, sendMetaEvent, type LeadScore } from "@/lib/meta-capi";

/* Qualification is decided client-side by runCalc() in lib/start/startCalc.ts
   and arrives already made, so we read it rather than recompute it — one
   calculation engine, one answer, no chance of the two drifting apart. */
function readQualification(payload: Record<string, unknown>) {
  const qualified = payload.borrowiq_qualified === "yes";
  const maxPurchasePrice = Number(payload.borrowiq_htb_max_price) || 0;
  return { qualified, maxPurchasePrice };
}

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Vercel sits behind proxies: the real client is the FIRST x-forwarded-for
    entry, the rest are hops. Meta uses this to match the event to a person,
    so sending a proxy IP is worse than sending none. */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() ?? "";
}

/**
 * Report the submission to Meta. Runs after the response is flushed, so
 * the results screen never waits on it.
 *
 * CalcSubmit for everyone; the conversion events for qualified leads only.
 * That single asymmetry is the whole point of this file.
 */
async function reportToMeta(
  payload: Record<string, unknown>,
  eventId: string,
  leadScore: LeadScore | null,
  ip: string,
  userAgent: string,
) {
  const { qualified, maxPurchasePrice } = readQualification(payload);

  const userData = {
    email: str(payload.email),
    phone: str(payload.phone),
    firstName: str(payload.firstName),
    lastName: str(payload.lastName),
    postcode: str(payload.borrowiq_postcode),
    externalId: eventId,
    clientIpAddress: ip,
    clientUserAgent: userAgent,
    fbc: str(payload.fbc),
    fbp: str(payload.fbp),
  };

  const eventSourceUrl = str(payload.page_url) || undefined;
  const eventTime = Math.floor(Date.now() / 1000);

  /* No PII here — categorical and aggregate values only. */
  const region = str(payload.borrowiq_region);
  const baseCustomData = {
    qualified,
    max_purchase_price: maxPurchasePrice,
    deposit_mode: str(payload.borrowiq_mode_at_submit),
    /* capital_regional covers greater-capital and the named 250k+ centres,
       which is what Meta would call metro. */
    ...(region
      ? { postcode_region: region === "capital_regional" ? "metro" : "regional" }
      : {}),
  };

  /* Every submission. Same event_id as the browser's CalcSubmit, so the
     two collapse into one event in Meta. */
  await sendMetaEvent({
    eventName: "CalcSubmit",
    eventId,
    eventTime,
    eventSourceUrl,
    userData,
    customData: baseCustomData,
  });

  if (!qualified || leadScore === null) return;

  /* Qualified only, and server-side only. Both standard events carry the
     lead score as value so Meta can weight a $750k lead above a $520k one
     — and so value optimisation can be switched on later without touching
     this code. Distinct event_ids: these have no browser twin to dedupe
     against, and sharing the CalcSubmit id would collide with it. */
  const conversionCustomData = {
    ...baseCustomData,
    lead_score: leadScore,
    currency: "AUD",
    value: leadScore,
  };

  await Promise.all([
    /* The live ad set optimises for CompleteRegistration. Keeping the name
       means no ad-set change and no learning reset — it just stops firing
       for people who can't buy. */
    sendMetaEvent({
      eventName: "CompleteRegistration",
      eventId: `${eventId}-cr`,
      eventTime,
      eventSourceUrl,
      userData,
      customData: conversionCustomData,
    }),
    /* Runs alongside so the ad set can be moved to Lead, or to value
       optimisation, whenever you want. */
    sendMetaEvent({
      eventName: "Lead",
      eventId: `${eventId}-lead`,
      eventTime,
      eventSourceUrl,
      userData,
      customData: conversionCustomData,
    }),
  ]);
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json({ ok: true, forwarded: false, reason: "no webhook configured" });
  }

  /* ── legacy body guard ────────────────────────────────────────────────
     This path used to be served by the v1 funnel. Anyone mid-quiz when the
     new build went out is still running the old JS, which posts raw QuizData
     here rather than a finished GHL payload — it has no `source`, and its
     phone lives under `mobile`. Forwarding it verbatim would land a broken
     contact in GHL, so hand it to the v1 builder instead and let it map the
     fields properly. Safe to delete once no old sessions can be in flight. */
  if (payload.source !== "borrowiq-start") {
    try {
      await buildAndSend(payload as QuizData, webhookUrl);
      return Response.json({ ok: true, forwarded: true, via: "v1-compat" });
    } catch {
      return Response.json({ ok: true, forwarded: false, via: "v1-compat" });
    }
  }

  const { qualified, maxPurchasePrice } = readQualification(payload);
  const leadScore = scoreLead({ qualified, maxPurchasePrice });
  const eventId = str(payload.event_id);

  // Sanitise exactly as the live calculator does: no undefined/null values,
  // so JSON.stringify never drops a key GHL is expecting.
  const body: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(payload)) {
    // page_url exists only to be Meta's event_source_url; GHL has no field
    // for it. event_id, fbp and fbc DO go through — see below.
    if (k === "page_url") continue;
    body[k] = (v ?? "") as string | number;
  }

  /* ADDITIVE for GHL: the Meta event id and lead score ride along with the
     existing fields so a contact in the CRM can be matched to the Meta
     event that reported it. Nothing existing is renamed or removed.
     Unqualified leads send an empty score — they have no Lead event. */
  body.lead_score = leadScore ?? "";

  /* Meta runs AFTER the GHL webhook and after the response is flushed.
     after() keeps the ordering while costing the results screen nothing —
     the client awaits this route before rendering results, so awaiting two
     Meta calls here would have put up to 6s in front of the user.

     Scheduled before the webhook call so it still runs if the webhook
     throws: a CRM outage should not also cost us the ad attribution. */
  const ip = clientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "";
  let webhookDone: Promise<unknown> = Promise.resolve();

  after(async () => {
    await webhookDone.catch(() => {});
    if (!eventId) {
      // Pre-CAPI client still in flight; nothing to dedupe against.
      console.warn("[/api/submit] no event_id on payload, skipping Meta");
      return;
    }
    await reportToMeta(payload, eventId, leadScore, ip, userAgent);
  });

  try {
    const send = fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    webhookDone = send;
    const res = await send;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[/api/submit] webhook ${res.status}: ${text.slice(0, 200)}`);
      return Response.json({ ok: true, forwarded: false, status: res.status });
    }

    return Response.json({ ok: true, forwarded: true, status: res.status });
  } catch (err) {
    // Webhook failure is non-blocking — the user still sees their results.
    console.error("[/api/submit] webhook error", err);
    return Response.json({ ok: true, forwarded: false, error: "webhook unreachable" });
  }
}
