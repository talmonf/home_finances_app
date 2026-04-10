import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSubscription } from "./actions";

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

function formatSubscriptionPaymentSummary(s: {
  credit_card: { card_name: string } | null;
  digital_payment_method: { name: string } | null;
}) {
  const parts: string[] = [];
  if (s.digital_payment_method?.name) parts.push(s.digital_payment_method.name);
  if (s.credit_card?.card_name) parts.push(s.credit_card.card_name);
  return parts.length ? parts.join(" · ") : "—";
}

function formatJobLabel(job: { job_title: string; employer_name: string | null }) {
  return job.employer_name ? `${job.job_title} · ${job.employer_name}` : job.job_title;
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const today = startOfToday();

  const [subscriptions, creditCards, digitalPaymentMethods, familyMembers, jobs] = await Promise.all([
    prisma.subscriptions.findMany({
      where: { household_id: householdId },
      include: { credit_card: true, digital_payment_method: true, family_member: true, job: true },
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
    prisma.digital_payment_methods.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { name: "asc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ job_title: "asc" }, { employer_name: "asc" }],
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
                {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
              </Link>
              <h1 className="text-2xl font-semibold text-slate-50">{isHebrew ? "מנויים" : "Subscriptions"}</h1>
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
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "הוספה חדשה" : "Add new"}</h2>
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
                Renewal date (annual, optional)
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
                htmlFor="monthly_day_of_month"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Monthly renewal day (1-31)
              </label>
              <input
                id="monthly_day_of_month"
                name="monthly_day_of_month"
                type="number"
                min="1"
                max="31"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Required for monthly interval"
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
              <label htmlFor="job_id" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "עבודה (אופציונלי)" : "Job (optional)"}
              </label>
              <select
                id="job_id"
                name="job_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="">None</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {formatJobLabel(j)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="digital_payment_method_id"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Digital payment (optional)
              </label>
              <select
                id="digital_payment_method_id"
                name="digital_payment_method_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="">None</option>
                {digitalPaymentMethods.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="credit_card_id"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Credit card (optional)
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
                {isHebrew ? "הוספת מנוי" : "Add subscription"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "רשימה" : "List"}</h2>
          {subscriptions.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {isHebrew ? "אין מנויים עדיין. ניתן להוסיף למעלה." : "No subscriptions yet. Add one above."}
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
                    <th className="px-4 py-3 font-medium text-slate-300">Job</th>
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
                        {formatHouseholdDate(s.start_date, dateDisplayFormat)} /{" "}
                        {formatHouseholdDate(s.renewal_date, dateDisplayFormat)}
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
                        {s.job ? (
                          <Link
                            href={`/dashboard/jobs/${s.job.id}`}
                            className="text-sky-400 hover:text-sky-300"
                          >
                            {formatJobLabel(s.job)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatSubscriptionPaymentSummary(s)}
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
                        <Link
                          href={`/dashboard/subscriptions/${s.id}`}
                          className="text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          {isHebrew ? "עריכה" : "Edit"}
                        </Link>
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
