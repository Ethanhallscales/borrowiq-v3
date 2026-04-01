"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { trackScheduleConfirmed, trackInitiateCheckout } from "@/lib/pixel";

const STRIPE_URL = process.env.NEXT_PUBLIC_STRIPE_LINK ?? "#";

export default function BookingSuccess() {
  useEffect(() => {
    trackScheduleConfirmed();
  }, []);

  return (
    <div
      className="relative flex min-h-dvh w-full flex-col items-center overflow-y-auto overflow-x-hidden px-5 py-12"
      style={{ background: "#020B18" }}
    >
      {/* Subtle gradient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(34,197,94,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">

        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Animated checkmark */}
          <motion.div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "2px solid rgba(34,197,94,0.4)",
              boxShadow: "0 0 48px -8px rgba(34,197,94,0.4)",
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
              <motion.path
                d="M8 18L15 25L28 11"
                stroke="#22c55e"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
              />
            </svg>
          </motion.div>

          <h1
            style={{
              fontFamily: "var(--font-bebas-neue)",
              fontSize: "clamp(2.2rem, 10vw, 3.2rem)",
              color: "#22c55e",
              letterSpacing: "0.04em",
              lineHeight: 1.1,
            }}
          >
            Booking Confirmed!
          </h1>

          <p
            className="mt-4"
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "1rem",
              color: "rgba(230,251,255,0.7)",
              lineHeight: 1.6,
            }}
          >
            One of our brokers will call you at your scheduled time. We look forward to chatting with you.
          </p>
        </motion.div>

        {/* ── In the meantime ─────────────────────────────────────────────────── */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <p
            className="mb-4 text-center"
            style={{
              fontFamily: "var(--font-bebas-neue)",
              fontSize: "1.3rem",
              color: "rgba(230,251,255,0.5)",
              letterSpacing: "0.08em",
            }}
          >
            In the meantime...
          </p>

          {/* $27 Accelerator card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(4,30,58,0.85)",
              border: "1.5px solid rgba(245,158,11,0.5)",
              boxShadow: "0 0 48px -16px rgba(245,158,11,0.35), inset 0 1px 0 rgba(245,158,11,0.12)",
            }}
          >
            {/* Header */}
            <div
              className="px-5 pt-5 pb-4"
              style={{ borderBottom: "1px solid rgba(245,158,11,0.18)" }}
            >
              <p
                style={{
                  fontFamily: "var(--font-bebas-neue)",
                  fontSize: "1.45rem",
                  color: "#fbbf24",
                  letterSpacing: "0.04em",
                  lineHeight: 1.15,
                }}
              >
                Your First Home Buyer Accelerator — $27
              </p>
              <p
                className="mt-1"
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "0.75rem",
                  color: "rgba(245,158,11,0.6)",
                }}
              >
                Hit the ground running before your call
              </p>
            </div>

            {/* Checklist */}
            <div className="px-5 py-4 flex flex-col gap-3">
              {[
                "Your personalised savings target — exactly how much to save each week based on your income",
                "Custom budget tracker spreadsheet built around your income",
                "Government scheme eligibility breakdown with application guides",
                "Step-by-step pre-approval checklist so you're ready the moment your numbers line up",
                "Priority broker callback — skip the queue when you're ready to buy",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span
                    style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "0.85rem",
                      color: "#fbbf24",
                      fontWeight: 700,
                      lineHeight: 1.5,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  <p
                    style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "0.82rem",
                      color: "rgba(230,251,255,0.75)",
                      lineHeight: 1.5,
                    }}
                  >
                    {item}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              <a
                href={STRIPE_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackInitiateCheckout()}
                className="block w-full rounded-xl py-4 text-base font-bold text-center"
                style={{
                  background: "linear-gradient(135deg,#92400e,#d97706,#fbbf24)",
                  color: "#020B18",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 0 28px -6px rgba(245,158,11,0.55)",
                  letterSpacing: "0.01em",
                }}
              >
                Get My Custom Plan — $27
              </a>
              <div className="mt-3 flex items-center justify-center gap-4">
                <p
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: "0.7rem",
                    color: "rgba(230,251,255,0.35)",
                  }}
                >
                  ⚡ Instant delivery to your email
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: "0.7rem",
                    color: "rgba(230,251,255,0.35)",
                  }}
                >
                  ✓ 30-day money-back guarantee
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Back link ───────────────────────────────────────────────────────── */}
        <motion.a
          href="/"
          className="mt-8 block text-center text-sm"
          style={{
            color: "rgba(230,251,255,0.3)",
            fontFamily: "var(--font-dm-sans)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Back to BorrowIQ
        </motion.a>

        <p
          className="mt-6 text-center"
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "0.68rem",
            color: "rgba(230,251,255,0.15)",
          }}
        >
          Powered by Assist Loans
        </p>
      </div>
    </div>
  );
}
