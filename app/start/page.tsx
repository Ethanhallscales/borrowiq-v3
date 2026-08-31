import type { Metadata } from "next";
import StartFlow from "./StartFlow";

export const metadata: Metadata = {
  title: "How much can you actually buy? | Assist Loans",
  description:
    "A 60-second check for first home buyers: your real buying power with a 2% deposit and Help to Buy, or a 5% deposit with no LMI.",
  robots: { index: false, follow: false },
};

/* Paid-traffic landing calculator. No nav, no footer links, no exits —
   the only outbound links are the book-a-call CTAs. */
export default function StartPage() {
  return (
    <main className="min-h-screen bg-ocean-base">
      {/* slider thumb styling, scoped to this route's .start-range inputs */}
      <style>{`
        .start-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 32px;
          width: 32px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid var(--ocean-accent);
          box-shadow: 0 4px 14px rgba(0, 194, 255, 0.55);
          cursor: pointer;
        }
        .start-range::-moz-range-thumb {
          height: 32px;
          width: 32px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid var(--ocean-accent);
          box-shadow: 0 4px 14px rgba(0, 194, 255, 0.55);
          cursor: pointer;
        }
      `}</style>

      <StartFlow />

      <footer className="px-5 pb-28 pt-10 text-center">
        <p className="mx-auto max-w-md text-[11px] leading-relaxed text-ocean-highlight/40">
          Russell Hall is a credit representative (CRN 554892) of BLSSA Pty Ltd ACN 117 651 760, Australian Credit
          Licence 391237. General information only — not financial advice or credit assistance.
        </p>
      </footer>
    </main>
  );
}
