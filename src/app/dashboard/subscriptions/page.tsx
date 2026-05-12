import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { SubscriptionFamilyJobSelects } from "@/components/subscription-family-job-selects";
import { HouseholdDateField } from "@/components/household-date-field";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { formatJobDisplayLabel } from "@/lib/job-label";
import type { Prisma } from "@/generated/prisma/client";
import { PrivateClinicFilterResetButton } from "@/components/private-clinic-filter-reset-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSubscription } from "./actions";

export const dynamic = "force-dynamic";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string) {
  return UUID_RE.test(s);
}

type ListStatusFilter = "active" | "cancelled" | "all";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    modal?: string;
    family_member_id?: string;
    job_id?: string;
    status?: string;
    pay?: string;
  }>;
};

function parseListStatusFilter(raw: string | undefined): ListStatusFilter {
  const v = raw?.toLowerCase();
  if (v === "cancelled" || v === "all") return v;
  return "active";
}

function subscriptionsListWhere(
  householdId: string,
  filters: {
    status: ListStatusFilter;
    familyMemberId: string | null;
    jobId: string | null;
    pay: string | null;
  },
): Prisma.subscriptionsWhereInput {
  const where: Prisma.subscriptionsWhereInput = { household_id: householdId };
  if (filters.status === "active") where.is_active = true;
  if (filters.status === "cancelled") where.is_active = false;
  if (filters.familyMemberId) where.family_member_id = filters.familyMemberId;
  if (filters.jobId) where.job_id = filters.jobId;
  if (filters.pay === "none") {
    where.credit_card_id = null;
    where.digital_payment_method_id = null;
  } else if (filters.pay?.startsWith("cc:")) {
    const id = filters.pay.slice(3);
    if (isUuid(id)) where.credit_card_id = id;
  } else if (filters.pay?.startsWith("dig:")) {
    const id = filters.pay.slice(4);
    if (isUuid(id)) where.digital_payment_method_id = id;
  }
  return where;
}

function subscriptionsListQueryString(args: {
  modal?: string;
  family_member_id?: string;
  job_id?: string;
  status?: ListStatusFilter;
  pay?: string;
}) {
  const sp = new URLSearchParams();
  if (args.modal) sp.set("modal", args.modal);
  if (args.family_member_id) sp.set("family_member_id", args.family_member_id);
  if (args.job_id) sp.set("job_id", args.job_id);
  if (args.status && args.status !== "active") sp.set("status", args.status);
  if (args.pay) sp.set("pay", args.pay);
  const q = sp.toString();
  return q ? `?${q}` : "";
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

function formatSubscriptionPaymentSummary(s: {
  credit_card: { card_name: string } | null;
  digital_payment_method: { name: string } | null;
}) {
  const parts: string[] = [];
  if (s.digital_payment_method?.name) parts.push(s.digital_payment_method.name);
  if (s.credit_card?.card_name) parts.push(s.credit_card.card_name);
  return parts.length ? parts.join(" · ") : "—";
}

const subscriptionSelectClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

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
  const modalMode = resolvedSearchParams?.modal === "new" ? "new" : null;
  const today = startOfToday();

  const familyMemberIdRaw = resolvedSearchParams?.family_member_id?.trim() ?? "";
  const jobIdRaw = resolvedSearchParams?.job_id?.trim() ?? "";
  const statusFilter = parseListStatusFilter(resolvedSearchParams?.status);
  const payRaw = resolvedSearchParams?.pay?.trim() ?? "";
  const familyMemberId =
    familyMemberIdRaw && isUuid(familyMemberIdRaw) ? familyMemberIdRaw : null;
  const jobId = jobIdRaw && isUuid(jobIdRaw) ? jobIdRaw : null;
  let payFilter: string | null = null;
  if (payRaw === "none") payFilter = "none";
  else if (payRaw.startsWith("cc:") && isUuid(payRaw.slice(3))) payFilter = payRaw;
  else if (payRaw.startsWith("dig:") && isUuid(payRaw.slice(4))) payFilter = payRaw;

  const listWhere = subscriptionsListWhere(householdId, {
    status: statusFilter,
    familyMemberId,
    jobId,
    pay: payFilter,
  });

  const [subscriptions, subscriptionTotalCount, creditCards, digitalPaymentMethods, familyMembers, jobs] =
    await Promise.all([
    prisma.subscriptions.findMany({
      where: listWhere,
      include: { credit_card: true, digital_payment_method: true, family_member: true, job: true },
      orderBy: [{ renewal_date: "asc" }, { name: "asc" }],
    }),
    prisma.subscriptions.count({ where: { household_id: householdId } }),
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

  const jobsForFilter = (() => {
    const base = familyMemberId ? jobs.filter((j) => j.family_member_id === familyMemberId) : jobs;
    if (!familyMemberId || !jobId) return base;
    const selected = jobs.find((j) => j.id === jobId);
    if (!selected) return base;
    return base.some((j) => j.id === selected.id) ? base : [...base, selected];
  })();

  const hasActiveFilters = Boolean(familyMemberId || jobId || payFilter || statusFilter !== "active");
  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-screen-2xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "רשימה" : "List"}</h2>
            <Link
              href={`/dashboard/subscriptions${subscriptionsListQueryString({
                modal: "new",
                family_member_id: familyMemberId ?? undefined,
                job_id: jobId ?? undefined,
                status: statusFilter,
                pay: payFilter ?? undefined,
              })}`}
              className="w-full rounded-lg bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
            >
              {isHebrew ? "הוספת מנוי" : "Add subscription"}
            </Link>
          </div>
          <form
            method="get"
            className="grid items-end gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-6"
          >
            <div>
              <label htmlFor="filter_family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "בן/בת משפחה" : "Family member"}
              </label>
              <select
                id="filter_family_member_id"
                name="family_member_id"
                defaultValue={familyMemberId ?? ""}
                className={subscriptionSelectClass}
              >
                <option value="">{isHebrew ? "הכל" : "All"}</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter_job_id" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "עבודה" : "Job"}
              </label>
              <select
                id="filter_job_id"
                name="job_id"
                defaultValue={jobId ?? ""}
                className={subscriptionSelectClass}
              >
                <option value="">{isHebrew ? "הכל" : "All"}</option>
                {jobsForFilter.map((j) => (
                  <option key={j.id} value={j.id}>
                    {formatJobDisplayLabel(j)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter_status" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "סטטוס" : "Status"}
              </label>
              <select
                id="filter_status"
                name="status"
                defaultValue={statusFilter}
                className={subscriptionSelectClass}
              >
                <option value="active">{isHebrew ? "פעיל בלבד" : "Active only"}</option>
                <option value="cancelled">{isHebrew ? "מבוטל בלבד" : "Cancelled only"}</option>
                <option value="all">{isHebrew ? "הכל" : "All"}</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter_pay" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "אמצעי תשלום" : "Payment method"}
              </label>
              <select id="filter_pay" name="pay" defaultValue={payFilter ?? ""} className={subscriptionSelectClass}>
                <option value="">{isHebrew ? "הכל" : "All"}</option>
                <option value="none">{isHebrew ? "ללא כרטיס / אפליקציה" : "None (no card or app)"}</option>
                {creditCards.map((c) => (
                  <option key={`cc-${c.id}`} value={`cc:${c.id}`}>
                    {isHebrew ? "כרטיס: " : "Card: "}
                    {buildCreditCardLabel(c)}
                  </option>
                ))}
                {digitalPaymentMethods.map((d) => (
                  <option key={`dig-${d.id}`} value={`dig:${d.id}`}>
                    {isHebrew ? "דיגיטלי: " : "Digital: "}
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-none items-end gap-2 lg:col-span-2 sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-600"
              >
                {isHebrew ? "החל סינון" : "Apply filters"}
              </button>
              {hasActiveFilters ? (
                <PrivateClinicFilterResetButton
                  href="/dashboard/subscriptions"
                  label={isHebrew ? "נקה" : "Clear"}
                />
              ) : null}
            </div>
          </form>
          {subscriptions.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {subscriptionTotalCount > 0
                ? isHebrew
                  ? "אין מנויים שמתאימים לסינון. נסו לשנות את הסינון או לנקות."
                  : "No subscriptions match these filters. Try adjusting or clear filters."
                : isHebrew
                  ? "אין מנויים עדיין."
                  : "No subscriptions yet."}
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
                            {formatJobDisplayLabel(s.job)}
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

        {modalMode === "new" ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-3 py-4 sm:px-4 sm:py-6">
            <div className="w-full max-w-screen-2xl rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-medium text-slate-100">{isHebrew ? "הוספה חדשה" : "Add new"}</h2>
                <Link
                  href={`/dashboard/subscriptions${subscriptionsListQueryString({
                    family_member_id: familyMemberId ?? undefined,
                    job_id: jobId ?? undefined,
                    status: statusFilter,
                    pay: payFilter ?? undefined,
                  })}`}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  {isHebrew ? "ביטול" : "Cancel"}
                </Link>
              </div>
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
              <HouseholdDateField
                id="start_date"
                name="start_date"
                defaultIsoYmd=""
                className="w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label
                htmlFor="renewal_date"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Renewal date (annual, optional)
              </label>
              <HouseholdDateField
                id="renewal_date"
                name="renewal_date"
                defaultIsoYmd=""
                className="w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
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
              <HouseholdDateField
                id="cancelled_at"
                name="cancelled_at"
                defaultIsoYmd=""
                className="w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <SubscriptionFamilyJobSelects
              members={familyMembers}
              jobs={jobs}
              memberLabel="Family member (optional)"
              jobLabel={isHebrew ? "עבודה (אופציונלי)" : "Job (optional)"}
              selectClassName={subscriptionSelectClass}
            />
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
              <textarea
                id="description"
                name="description"
                rows={5}
                className="min-h-[7.5rem] w-full resize-y rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional notes"
              />
            </div>
                <div className="flex flex-wrap items-end gap-3 lg:col-span-3">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 sm:w-fit"
                  >
                    {isHebrew ? "הוספת מנוי" : "Add subscription"}
                  </button>
                  <Link
                    href={`/dashboard/subscriptions${subscriptionsListQueryString({
                      family_member_id: familyMemberId ?? undefined,
                      job_id: jobId ?? undefined,
                      status: statusFilter,
                      pay: payFilter ?? undefined,
                    })}`}
                    className="text-sm text-slate-400 hover:text-slate-200"
                  >
                    {isHebrew ? "ביטול" : "Cancel"}
                  </Link>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
