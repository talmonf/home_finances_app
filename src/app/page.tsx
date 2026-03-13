import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-2xl bg-slate-900 px-10 py-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
          <h1 className="mb-3 text-2xl font-semibold text-slate-50">
            Home Finance Management
          </h1>
          <p className="mb-6 text-sm text-slate-400">
            Please sign in to access your households and finances.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">
              Welcome back, {session.user.name ?? "user"}
            </h1>
            <p className="text-sm text-slate-400">
              This dashboard will show your households, accounts, and key
              finance insights.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              Households
            </h2>
            <p className="text-xs text-slate-400">
              A households overview page will appear here once implemented.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              Accounts
            </h2>
            <p className="text-xs text-slate-400">
              Bank accounts, cards, and wallets will be accessible from the
              Accounts section.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              Reports
            </h2>
            <p className="text-xs text-slate-400">
              Your P&amp;L and other reports will live here as we build them
              out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
