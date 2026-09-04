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
   ============================================================ */

import type { QuizData } from "@/lib/types";
import { buildAndSend } from "@/app/v1/api/submit/route";

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

  // Sanitise exactly as the live calculator does: no undefined/null values,
  // so JSON.stringify never drops a key GHL is expecting.
  const body: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(payload)) {
    body[k] = (v ?? "") as string | number;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

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
