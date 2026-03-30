import type { Metadata, Viewport } from "next";
import { DM_Sans, Bebas_Neue } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas-neue",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BorrowIQ — Borrowing Power Calculator | Assist Loans",
  description:
    "Find out how much you can borrow, which government grants you qualify for, and what it costs to buy your first home. Free 60-second tool by Assist Loans.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "BorrowIQ" },
};

export const viewport: Viewport = {
  themeColor: "#020B18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bebasNeue.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
