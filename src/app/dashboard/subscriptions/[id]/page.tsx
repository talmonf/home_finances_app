import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateSubscription } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; updated?: string }>;
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateInput(d: Date | null) {
  if (!d) return "";
  const date = new Date(d);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatScheme(scheme: string) {
  if (scheme === "amex") return "Amex";
  if (scheme === "diners_club") return "Diners Club";
  if (scheme === "isracard") return "Isracard";
  if (scheme === "mastercard") return "Mastercard";
  if (scheme === "visa") return "Visa";
  return "Other";
}

function formatJobLabel(job: { job_title: string; employer_name: string | null }) {
  return job.employer_name ? `${job.job_title} · ${job.employer_name}` : job.job_title;
}

function buildCreditCardLabel(card: {
  card_name: string;
  scheme: string;
  issuer_name: string;
  co_brand: string | null;
  product_name: string | null;
  card_last_four: string;
  cancelled_at: Date | null;
}) {
  const coBrandPart = card.co_brand ? ` / ${card.co_brand}` : "";
  const productPart = card.product_name ? ` / ${card.product_name}` : "";
  const cancelledPart = card.cancelled_at ? " (cancelled)" : "";
  return `${card.card_name} (${formatScheme(card.scheme)}) - ${card.issuer_name}${coBrandPart}${productPart} - ****${card.card_last_four}${cancelledPart}`;
}

export default async function EditSubscriptionPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const today = startOfToday();

  const subscription = await prisma.subscriptions.findFirst({
    where: { id, household_id: householdId },
  });
  if (!subscription) {
    redirect("/dashboard/subscriptions?error=Not+found");
  }

  const [creditCards, digitalPaymentMethods, familyMembers, jobs] = await Promise.all([
    prisma.credit_cards.findMany({
      where: {
        household_id: householdId,
        OR: [
          ...(subscription.credit_card_id ? [{ id: subscription.credit_card_id }] : []),
          {
            cancelled_at: null,
            OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
          },
        ],
      },
      orderBy: { card_name: "asc" },
    }),
    prisma.digital_payment_methods.findMany({
      where: {
        household_id: householdId,
        OR: [
          ...(subscription.digital_payment_method_id
            ? [{ id: subscription.digital_payment_method_id }]
            : []),
          { is_active: true },
        ],
      },
      orderBy: { name: "asc" },
    }),
    prisma.family_members.findMany({
      where: {
        household_id: householdId,
        OR: [
          ...(subscription.family_member_id ? [{ id: subscription.family_member_id }] : []),
          { is_active: true },
        ],
      },
      orderBy: { full_name: "asc" },
    }),
    prisma.jobs.findMany({
      where: {
        household_id: householdId,
        OR: [
          ...(subscription.job_id ? [{ id: subscription.job_id }] : []),
          { is_active: true },
        ],
      },
      orderBy: [{ job_title: "asc" }, { employer_name: "asc" }],
    }),
  ]);

  const inputClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/subscriptions"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה למנויים →" : "← Back to subscriptions"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{isHebrew ? "עריכת מנוי" : "Edit subscription"}</h1>
          {resolvedSearchParams?.updated && (
            <div className="rounded-lg border border-emerald-600 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
              {isHebrew ? "עודכן." : "Updated."}
            </div>
          )}
          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
            </div>
          )}
        </header>

        <section className="space-y-4">
          <form
            action={updateSubscription}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input type="hidden" name="id" value={subscription.id} />
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-slate-400">
                Name
              </label>
              <input id="name" name="name" required defaultValue={subscription.name} className={inputClass} />
            </div>
            <div>
              <label htmlFor="start_date" className="mb-1 block text-xs font-medium text-slate-400">
                Start date (optional)
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={formatDateInput(subscription.start_date)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="renewal_date" className="mb-1 block text-xs font-medium text-slate-400">
                Renewal date (annual, optional)
              </label>
              <input
                id="renewal_date"
                name="renewal_date"
                type="date"
                defaultValue={formatDateInput(subscription.renewal_date)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="monthly_day_of_month" className="mb-1 block text-xs font-medium text-slate-400">
                Monthly renewal day (1-31)
              </label>
              <input
                id="monthly_day_of_month"
                name="monthly_day_of_month"
                type="number"
                min="1"
                max="31"
                defaultValue={subscription.monthly_day_of_month ?? ""}
                className={inputClass}
                placeholder="Required for monthly interval"
              />
            </div>
            <div>
              <label htmlFor="fee_amount" className="mb-1 block text-xs font-medium text-slate-400">
                Fee amount
              </label>
              <input
                id="fee_amount"
                name="fee_amount"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={subscription.fee_amount.toString()}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="currency" className="mb-1 block text-xs font-medium text-slate-400">
                Currency
              </label>
              <input
                id="currency"
                name="currency"
                defaultValue={subscription.currency}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="billing_interval" className="mb-1 block text-xs font-medium text-slate-400">
                Billing interval
              </label>
              <select
                id="billing_interval"
                name="billing_interval"
                required
                defaultValue={subscription.billing_interval}
                className={inputClass}
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-400">
                Status
              </label>
              <select
                id="status"
                name="status"
                required
                defaultValue={subscription.is_active ? "active" : "cancelled"}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label htmlFor="cancelled_at" className="mb-1 block text-xs font-medium text-slate-400">
                Cancellation date (required if Cancelled)
              </label>
              <input
                id="cancelled_at"
                name="cancelled_at"
                type="date"
                defaultValue={formatDateInput(subscription.cancelled_at)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
                Family member (optional)
              </label>
              <select
                id="family_member_id"
                name="family_member_id"
                defaultValue={subscription.family_member_id ?? ""}
                className={inputClass}
              >
                <option value="">None</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                    {!m.is_active ? " (inactive)" : ""}
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
                defaultValue={subscription.job_id ?? ""}
                className={inputClass}
              >
                <option value="">None</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {formatJobLabel(j)}
                    {!j.is_active ? " (inactive)" : ""}
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
                defaultValue={subscription.digital_payment_method_id ?? ""}
                className={inputClass}
              >
                <option value="">None</option>
                {digitalPaymentMethods.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {!d.is_active ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="credit_card_id" className="mb-1 block text-xs font-medium text-slate-400">
                Credit card (optional)
              </label>
              <select
                id="credit_card_id"
                name="credit_card_id"
                defaultValue={subscription.credit_card_id ?? ""}
                className={inputClass}
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
              <label htmlFor="website_url" className="mb-1 block text-xs font-medium text-slate-400">
                Website / URL
              </label>
              <input
                id="website_url"
                name="website_url"
                defaultValue={subscription.website_url ?? ""}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="mb-1 block text-xs font-medium text-slate-400">
                Description
              </label>
              <input
                id="description"
                name="description"
                defaultValue={subscription.description ?? ""}
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                {isHebrew ? "שמירת שינויים" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

