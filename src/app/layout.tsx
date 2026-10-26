import type { Metadata } from "next";
import Link from "next/link";
import { Flower2 } from "lucide-react";
import { Navigation } from "@/components/navigation";
import "@fontsource-variable/dm-sans";
import "@fontsource/libre-baskerville/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Planora AI — A little structure. A lovely celebration.",
    template: "%s | Planora AI",
  },
  description:
    "A thoughtful workspace for weddings, birthdays, and community celebrations. Start with the details that matter.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand" aria-label="Planora AI home">
              <Flower2 aria-hidden="true" size={30} strokeWidth={1.5} />
              <span>
                planora<span className="brand-ai">AI</span>
              </span>
            </Link>
            <Navigation />
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <span>Made for the moments that bring us together.</span>
          <span>Weddings · Birthdays · Community</span>
        </footer>
      </body>
    </html>
  );
}
