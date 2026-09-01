/* ============================================================
   /start SUBMIT ROUTE  →  POST /start/api/submit

   Forwards the /start lead to the SAME GoHighLevel endpoint the live
   BorrowIQ calculator uses: process.env.GHL_WEBHOOK_URL.

   This mirrors the send half of buildAndSend() in app/api/submit/route.ts
   (same env var, same headers, same non-blocking failure behaviour) rather
   than importing it, because that function builds its own payload from
   QuizData and is owned by the live funnel. The payload itself is built
   client-side in app/start/submitStart.ts, which holds the field contract.

   PATH NOTE: if /start is promoted to the site root, this file moves up
   with the rest of the folder and becomes /api/submit, while the current
   funnel moves to /v1. The outbound GHL URL is an env var, so nothing
   about the webhook changes — GHL should route on `source`, not the path.
   ============================================================ */

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
      console.error(`[/start] webhook ${res.status}: ${text.slice(0, 200)}`);
      return Response.json({ ok: true, forwarded: false, status: res.status });
    }

    return Response.json({ ok: true, forwarded: true, status: res.status });
  } catch (err) {
    // Webhook failure is non-blocking — the user still sees their results.
    console.error("[/start] webhook error", err);
    return Response.json({ ok: true, forwarded: false, error: "webhook unreachable" });
  }
}
