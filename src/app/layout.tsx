import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Home Finance Management",
  description: "Self-hosted multi-household personal finance system",
};

// Ensure layout is rendered per request so it always sees the latest session
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthSession();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        <div className="min-h-screen">
          <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
              <Link href="/" className="font-semibold tracking-tight">
                Home Finance Management
              </Link>
              {session?.user ? (
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <span>
                    Signed in as{" "}
                    <span className="font-medium text-slate-50">
                      {session.user.name ?? session.user.email}
                    </span>
                    {session.user.isSuperAdmin && (
                      <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                        Super admin
                      </span>
                    )}
                  </span>
                  <a
                    href="/api/auth/signout?callbackUrl=/"
                    className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                  >
                    Sign out
                  </a>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                >
                  Sign in
                </Link>
              )}
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
