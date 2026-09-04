import type { Metadata } from "next";

/* The ORIGINAL BorrowIQ funnel, preserved at /v1 after the newer calculator
   took over the site root. Still fully live — existing links and any ad
   creative pointing here keep working, and it reports to the same GHL
   webhook via /v1/api/submit (source="borrowiq").

   Kept out of the index so it can't compete with the root calculator in
   search results for the same terms. */
export const metadata: Metadata = {
  title: "BorrowIQ — Borrowing Power Calculator | Assist Loans",
  robots: { index: false, follow: false },
};

export default function V1Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
