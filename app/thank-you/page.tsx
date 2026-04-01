"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { trackPurchase } from "@/lib/pixel";

export default function ThankYou() {
  useEffect(() => {
    trackPurchase();
  }, []);

  return (
    <div
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-5"
      style={{ background: "#020B18" }}
    >
      {/* Subtle gradient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(34,197,94,0.12) 0%, transparent 70%)",
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Checkmark */}
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
            fontSize: "clamp(2rem, 9vw, 3rem)",
            color: "#22c55e",
            letterSpacing: "0.04em",
            lineHeight: 1.1,
          }}
        >
          You&apos;re All Set
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
          Your personalised buying plan is on its way to your inbox. Check your email in the next few minutes.
        </p>

        <motion.div
          className="mt-8 rounded-2xl px-5 py-5"
          style={{
            background: "rgba(4,30,58,0.65)",
            border: "1px solid rgba(10,61,107,0.6)",
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p
            style={{
              fontFamily: "var(--font-bebas-neue)",
              fontSize: "1.2rem",
              color: "#00C2FF",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            What Happens Next
          </p>
          <div className="flex flex-col gap-3 text-left">
            {[
              "Check your email for your custom plan PDF",
              "Review your personalised savings targets and budget tracker",
              "When you're ready, book a free call with our team to get moving",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(0,194,255,0.12)",
                    border: "1px solid rgba(0,194,255,0.3)",
                    fontFamily: "var(--font-bebas-neue)",
                    fontSize: "0.85rem",
                    color: "#00C2FF",
                  }}
                >
                  {i + 1}
                </span>
                <p
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: "0.85rem",
                    color: "rgba(230,251,255,0.6)",
                    lineHeight: 1.5,
                  }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.a
          href="/"
          className="mt-6 inline-block rounded-xl px-8 py-3 text-sm font-semibold"
          style={{
            background: "rgba(0,194,255,0.1)",
            border: "1px solid rgba(0,194,255,0.3)",
            color: "#00C2FF",
            fontFamily: "var(--font-dm-sans)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.97 }}
        >
          Back to BorrowIQ
        </motion.a>

        <p
          className="mt-8 text-center"
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "0.68rem",
            color: "rgba(230,251,255,0.2)",
          }}
        >
          Powered by Assist Loans
        </p>
      </motion.div>
    </div>
  );
}
