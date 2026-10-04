import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Country Standard Index",
  description:
    "A transparent quality-of-life index built from official statistics: affordability, health, jobs, education, safety, freedom and environment, with full history and drill-down.",
};

const nav = [
  { href: "/", label: "Ranking" },
  { href: "/history", label: "History" },
  { href: "/components", label: "Components" },
  { href: "/methodology", label: "Methodology" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <header className="border-b hairline bg-surface-1">
          <div className="mx-auto max-w-7xl px-4 min-h-14 py-2 flex flex-wrap items-center gap-x-6 gap-y-1">
            <Link href="/" className="font-semibold tracking-tight text-primary whitespace-nowrap">
              Country Standard Index
            </Link>
            <nav className="flex gap-4 text-sm text-secondary overflow-x-auto">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-primary">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 py-8 text-xs text-muted">
          Data: World Bank World Development Indicators and Worldwide Governance Indicators, UNDP Human Development
          Report 2025, V-Dem Institute (via Our World in Data). Scores are computed from these sources; where an
          official number does not exist the page says so. See Methodology for every assumption.
        </footer>
      </body>
    </html>
  );
}
