import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSubscription, toggleSubscriptionActive } from "./actions";

export const dynamic = "force-dynamic";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateOptional(d: Date | null) {
  if (!d) return "—";
  return formatDate(d);
}

function formatMoney(value: unknown) {
  if (value == null) return "—";
  const n =
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value
      ? (value as { toNumber(): number }).toNumber()
      : Number(value);
  return Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoneyWithCurrency(value: unknown, currency: string) {
  const amount = formatMoney(value);
  if (amount === "—") return "—";
  return `${amount} ${currency}`;
}

function formatScheme(scheme: string) {
  if (scheme === "amex") return "Amex";
  if (scheme === "diners_club") return "Diners Club";
  if (scheme === "isracard") return "Isracard";
  if (scheme === "mastercard") return "Mastercard";
  if (scheme === "visa") return "Visa";
  return "Other";
}

function buildCreditCardLabel(card: {
  card_name: string;
  scheme: string;
  issuer_name: string;
  co_brand: string | null;
  product_name: string | null;
  card_last_four: string;
}) {
  const coBrandPart = card.co_brand ? ` / ${card.co_brand}` : "";
  const productPart = card.product_name ? ` / ${card.product_name}` : "";
  return `${card.card_name} (${formatScheme(card.scheme)}) - ${card.issuer_name}${coBrandPart}${productPart} - ****${card.card_last_four}`;
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const today = startOfToday();

  const [subscriptions, creditCards, familyMembers] = await Promise.all([
    prisma.subscriptions.findMany({
      where: { household_id: householdId },
      include: { credit_card: true, family_member: true },
      orderBy: [{ renewal_date: "asc" }, { name: "asc" }],
    }),
    prisma.credit_cards.findMany({
      where: {
        household_id: householdId,
        cancelled_at: null,
        OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
      },
      orderBy: { card_name: "asc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/"
                className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
              >
                ← Back to dashboard
              </Link>
              <h1 className="text-2xl font-semibold text-slate-50">
                Subscriptions
              </h1>
              <p className="text-sm text-slate-400">
                Track recurring subscriptions, renewal dates, and payment methods.
              </p>
            </div>
          </div>

          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.error) && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              <span>
                {resolvedSearchParams.error
                  ? decodeURIComponent(
                      resolvedSearchParams.error.replace(/\+/g, " "),
                    )
                  : resolvedSearchParams.created
                    ? "Subscription added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new</h2>
          <form
            action={createSubscription}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                placeholder="e.g. Netflix"
              />
            </div>
            <div>
              <label
                htmlFor="start_date"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Start date (optional)
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="renewal_date"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Renewal date (optional)
              </label>
              <input
                id="renewal_date"
                name="renewal_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="fee_amount"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Fee amount
              </label>
              <input
                id="fee_amount"
                name="fee_amount"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="0.00"
              />
            </div>
            <div>
              <label
                htmlFor="currency"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Currency
              </label>
              <input
                id="currency"
                name="currency"
                defaultValue="ILS"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. ILS, USD"
              />
            </div>
            <div>
              <label
                htmlFor="billing_interval"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Billing interval
              </label>
              <select
                id="billing_interval"
                name="billing_interval"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="status"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                required
                defaultValue="active"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="cancelled_at"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Cancellation date (required if Cancelled)
              </label>
              <input
                id="cancelled_at"
                name="cancelled_at"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="family_member_id"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Family member (optional)
              </label>
              <select
                id="family_member_id"
                name="family_member_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="">None</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="credit_card_id"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Payment method (optional)
              </label>
              <select
                id="credit_card_id"
                name="credit_card_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">None</option>
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {buildCreditCardLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="website_url"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Website / URL
              </label>
              <input
                id="website_url"
                name="website_url"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional (e.g. netflix.com)"
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="description"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Description
              </label>
              <input
                id="description"
                name="description"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional notes"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Add subscription
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">List</h2>
          {subscriptions.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No subscriptions yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      Start / Renewal
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">Fee</th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      Interval
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      Family member
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      Payment method
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">Website</th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr
                      key={s.id}
                      id={`subscription-${s.id}`}
                      className="border-b border-slate-700/80 hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 text-slate-100">{s.name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDateOptional(s.start_date)} / {formatDateOptional(s.renewal_date)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatMoneyWithCurrency(s.fee_amount, s.currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 capitalize">
                        {s.billing_interval}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {s.family_member ? (
                          <Link
                            href={`/dashboard/family-members/${s.family_member.id}`}
                            className="text-sky-400 hover:text-sky-300"
                          >
                            {s.family_member.full_name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {s.credit_card?.card_name ?? "—"}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-slate-400" title={s.website_url ?? undefined}>
                        {s.website_url ? (
                          <a
                            href={s.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:text-sky-300"
                          >
                            {s.website_url}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            s.is_active
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }
                        >
                          {s.is_active ? "Active" : "Cancelled"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form
                          action={toggleSubscriptionActive.bind(null, s.id, !s.is_active)}
                          className="inline"
                        >
                          <button
                            type="submit"
                            className="text-xs font-medium text-sky-400 hover:text-sky-300"
                          >
                            {s.is_active ? "Edit" : "Activate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
