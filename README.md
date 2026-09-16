This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Meta CAPI

The root calculator reports to Meta from the **server**, not the browser. It
used to fire `Lead` and `CompleteRegistration` from the results screen on
every submission, which taught Meta to optimise for people who finish forms
rather than people who can actually buy — the unqualified share climbed from
~29% to ~47% in ten days.

### The three events

| Event | Fires for | Where | Optimisable |
|---|---|---|---|
| `CalcSubmit` | **every** completed calculator | browser **and** server, deduped | no — custom, on purpose |
| `CompleteRegistration` | **qualified only** | server only | yes — what the live ad set uses |
| `Lead` | **qualified only** | server only | yes — for a later switch |

`CalcSubmit` is deliberately a **custom** event. It exists to record total
volume, and nothing should ever be able to optimise for it.

Both conversion events carry `currency: "AUD"` and `value` = the lead score.

### Dedup

On submit the client mints a UUID (`crypto.randomUUID()`) and fires
`fbq('trackCustom', 'CalcSubmit', {}, { eventID })`. The same id goes to
`/api/submit` in the payload, and the server sends its `CalcSubmit` with that
same `event_id`. Meta collapses the pair into one event, so an ad blocker
costs us nothing and a working browser doesn't double-count.

The conversion events use derived ids — `{event_id}-cr` and `{event_id}-lead`
— because they have no browser twin to dedupe against, and reusing the
`CalcSubmit` id would collide with it.

The client also forwards `_fbp` and `_fbc`. If `_fbc` is missing (the pixel
hasn't loaded, or is blocked) it is rebuilt from the URL's `fbclid` as
`fb.1.{timestamp}.{fbclid}`, falling back to the stored first-touch `fbclid`.

### Lead score

Drives `value` on the conversion events, so Meta can weight a $750k lead
above a $520k one — and so value optimisation can be turned on later without
touching the code.

| Score | Help to Buy max purchase price |
|---|---|
| 1 | $500,000 – $600,000 |
| 2 | $600,000 – $700,000 |
| 3 | $700,000+ |

Thresholds live in one place: `LEAD_SCORE_TIERS` in `lib/meta-capi.ts`.
Unqualified submissions get no conversion event and no score.

Qualification itself is unchanged and still decided by `runCalc()` in
`lib/start/startCalc.ts` (`htb.maxPrice >= $500,000`). The route reads the
result off the payload rather than recomputing it, so there is only ever one
calculation engine.

### Matching and privacy

`user_data` sends SHA-256 of the normalised email, phone, first name, last
name and postcode, plus the submission id as `external_id`. Phones are
normalised to E.164 digits without the `+` (a leading `0` becomes `61`). IP,
user agent, `fbc` and `fbp` go unhashed, as Meta requires.

`custom_data` carries no PII — only `qualified`, `max_purchase_price`,
`deposit_mode`, `postcode_region` and `lead_score`. Failures log the event
name and HTTP status only; never the token, never the payload.

### Failure behaviour

Meta calls run inside Next's `after()`, so they happen after the response is
flushed and the results screen never waits on them. They are scheduled before
the webhook call and run after it completes, so a CRM outage doesn't also cost
the ad attribution. Each call has a 3s timeout and swallows its errors — a
Meta outage must never cost a lead.

### Env vars

| Var | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | browser + server | one pixel, both sides — dedup depends on it |
| `META_CAPI_ACCESS_TOKEN` | server only | never prefix `NEXT_PUBLIC_` |
| `META_TEST_EVENT_CODE` | server only | optional; **must be unset in production** |

### Verifying with Test Events

1. Events Manager → your pixel → **Test Events**, and note the code
   (`TEST66053`).
2. Set `META_TEST_EVENT_CODE=TEST66053` on the environment you're testing.
3. Run a submission. Test Events should show:
   - `CalcSubmit` — **Browser** and **Server**, marked deduplicated
   - `CompleteRegistration` and `Lead` — **Server** only, and only if the
     submission qualified, each with `value` 1, 2 or 3
4. Open the server events and confirm `event_source_url`, the hashed
   `em`/`ph`/`fn`/`ln`/`zp`, and `fbp`/`fbc` are present.
5. **Unset `META_TEST_EVENT_CODE` before going live.** While it is set the
   events do not count as conversions and the ad set sees nothing.

### Ads Manager

No ad-set change is required — `CompleteRegistration` keeps its name and
simply stops firing for unqualified submissions. Expect reported conversion
volume to drop by roughly the unqualified share (~47%); that is the fix
working, not a regression. Meta needs roughly 50 conversions per week per ad
set to stay out of the learning phase, so if volume drops below that,
consolidate ad sets rather than reverting to counting everyone.
