import Link from "next/link";
import { getAuthSession } from "@/lib/auth";

export default async function Home() {
  const session = await getAuthSession();

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

  const isSuperAdmin = session.user.isSuperAdmin;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">
              Welcome back, {session.user.name ?? "user"}
            </h1>
            <p className="text-sm text-slate-400">
              {isSuperAdmin
                ? "Use the super admin tools to manage households and platform users."
                : "This dashboard will show your households, accounts, and key finance insights."}
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              {isSuperAdmin ? "Households (Super Admin)" : "Households"}
            </h2>
            <p className="mb-3 text-xs text-slate-400">
              {isSuperAdmin
                ? "Create and manage all households on the platform."
                : "A households overview page will appear here once implemented."}
            </p>
            {isSuperAdmin && (
              <Link
                href="/admin/households"
                className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Open household admin
              </Link>
            )}
          </div>
          {!isSuperAdmin && (
            <>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Family members
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Manage people in your household for studies, classes, and cards.
                </p>
                <Link
                  href="/dashboard/family-members"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Family members
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Homes &amp; properties
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Define homes or apartments you own or rent, and the utility companies that service them.
                </p>
                <Link
                  href="/dashboard/properties"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Homes &amp; properties
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Bank accounts
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Manage bank accounts for this household.
                </p>
                <Link
                  href="/dashboard/bank-accounts"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Bank accounts
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Digital payment methods
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Bit, PayBox, PayPal, and other wallets or payment apps.
                </p>
                <Link
                  href="/dashboard/digital-payment-methods"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Digital payment methods
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Credit cards
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Manage credit cards and link to settlement accounts.
                </p>
                <Link
                  href="/dashboard/credit-cards"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Credit cards
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Import statements
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Upload PDF or Excel bank statements, review transactions, and fill categories and notes.
                </p>
                <Link
                  href="/dashboard/import"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Import
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Tasks
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Create and track tasks. Assign to family members or financial advisors.
                </p>
                <Link
                  href="/dashboard/tasks"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Tasks
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Studies &amp; Classes
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Track studies and classes per family member with expected costs.
                </p>
                <Link
                  href="/dashboard/studies-and-classes"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Studies &amp; Classes
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Subscriptions
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Track recurring subscriptions, renewal dates, and payment methods.
                </p>
                <Link
                  href="/dashboard/subscriptions"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Subscriptions
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Upcoming Renewals
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  See all upcoming renewals and expirations across subscriptions, identity, cards,
                  insurance, utilities, donations, and warranty-bearing significant purchases.
                </p>
                <Link
                  href="/dashboard/upcoming-renewals"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Upcoming Renewals
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Significant purchases
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Track major purchases with optional warranty expiry and link card transactions.
                </p>
                <Link
                  href="/dashboard/significant-purchases"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open Significant purchases
                </Link>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
