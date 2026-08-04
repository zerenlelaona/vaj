import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VAJ — Visa-Aware Jobs NL",
  description:
    "Check IND recognised sponsors and track job applications by permit fit.",
  manifest: `${BASE}/manifest.webmanifest`,
  icons: { icon: `${BASE}/icon.svg` },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorker />
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="text-lg">🇳🇱</span>
              <span>VAJ</span>
              <span className="hidden text-sm font-normal text-slate-500 sm:inline">
                Visa-Aware Jobs NL
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Check
              </Link>
              <Link
                href="/discover"
                className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Discover
              </Link>
              <Link
                href="/sponsors"
                className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Sponsors
              </Link>
              <Link
                href="/tracker"
                className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Tracker
              </Link>
              <Link
                href="/stories"
                className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Stories
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
          Data: IND public register of recognised sponsors (ind.nl), updated
          monthly. Not legal advice.
        </footer>
      </body>
    </html>
  );
}
