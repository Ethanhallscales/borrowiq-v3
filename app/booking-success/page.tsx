"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { trackScheduleConfirmed } from "@/lib/pixel";

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
