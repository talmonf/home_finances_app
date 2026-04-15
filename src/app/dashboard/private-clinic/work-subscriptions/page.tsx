import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { OBFUSCATED } from "@/lib/privacy-display";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { privateClinicWorkSubscriptions } from "@/lib/private-clinic-i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSubscription } from "@/app/dashboard/subscriptions/actions";
import { jobWhereInPrivateClinicModule, jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";

export const dynamic = "force-dynamic";

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

function formatMoneyWithCurrency(value: unknown, currency: string, obfuscate: boolean) {
  if (obfuscate) return OBFUSCATED;
  const amount = formatMoney(value);
  if (amount === "—") return "—";
  return `${amount} ${currency}`;
}

function formatJobLabel(job: { job_title: string; employer_name: string | null }) {
  return job.employer_name ? `${job.job_title} · ${job.employer_name}` : job.job_title;
}

type PageProps = {
  searchParams?: Promise<{ created?: string; error?: string }>;
};

export default async function WorkSubscriptionsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const t = privateClinicWorkSubscriptions(uiLanguage);
  const resolved = searchParams ? await searchParams : undefined;

  const [subscriptions, jobs] = await Promise.all([
    prisma.subscriptions.findMany({
      where: {
        household_id: householdId,
        job_id: { not: null },
        job: jobWhereInPrivateClinicModule,
      },
      include: { job: true },
      orderBy: [{ renewal_date: "asc" }, { name: "asc" }],
    }),
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId }),
      orderBy: [{ job_title: "asc" }, { employer_name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-lg font-medium text-slate-200">{t.title}</h2>
        <p className="text-sm text-slate-400">{t.blurb}</p>
        <p className="text-xs text-slate-500">
          <Link href="/dashboard/subscriptions" className="text-sky-400 hover:text-sky-300">
            {t.mainSubscriptionsLink}
          </Link>
        </p>
      </header>

      {(resolved?.created || resolved?.error) && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            resolved.error
              ? "border-rose-600 bg-rose-950/60 text-rose-100"
              : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
          }`}
        >
          {resolved.error
            ? decodeURIComponent(resolved.error.replace(/\+/g, " "))
            : t.createdMsg}
        </div>
      )}

      <section className="space-y-4">
        <h3 className="text-md font-medium text-slate-200">{t.addTitle}</h3>
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500">{t.errJob}</p>
        ) : (
          <form
            action={createSubscription}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input type="hidden" name="subscription_form_context" value="private_clinic_work" />
            <input type="hidden" name="status" value="active" />
            <div>
              <label htmlFor="job_id" className="mb-1 block text-xs font-medium text-slate-400">
                {t.jobRequired} <span className="text-rose-400">*</span>
              </label>
              <select
                id="job_id"
                name="job_id"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="" disabled>
                  {t.selectJob}
                </option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {formatJobLabel(j)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-slate-400">
                {t.name} <span className="text-rose-400">*</span>
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Zoom"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="mb-1 block text-xs font-medium text-slate-400">
                {t.description}
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                className="min-h-[7.5rem] w-full resize-y rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="billing_interval" className="mb-1 block text-xs font-medium text-slate-400">
                {t.billing} <span className="text-rose-400">*</span>
              </label>
              <select
                id="billing_interval"
                name="billing_interval"
                required
                defaultValue="annual"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="annual">{t.annual}</option>
                <option value="monthly">{t.monthly}</option>
              </select>
            </div>
            <div>
              <label htmlFor="monthly_day_of_month" className="mb-1 block text-xs font-medium text-slate-400">
                {t.monthlyDay}
              </label>
              <input
                id="monthly_day_of_month"
                name="monthly_day_of_month"
                type="number"
                min={1}
                max={31}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="1–31"
              />
            </div>
            <div>
              <label htmlFor="renewal_date" className="mb-1 block text-xs font-medium text-slate-400">
                {t.renewalDate}
              </label>
              <input
                id="renewal_date"
                name="renewal_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="fee_amount" className="mb-1 block text-xs font-medium text-slate-400">
                {t.feeAmount} <span className="text-rose-400">*</span>
              </label>
              <input
                id="fee_amount"
                name="fee_amount"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="currency" className="mb-1 block text-xs font-medium text-slate-400">
                {t.currency} <span className="text-rose-400">*</span>
              </label>
              <select
                id="currency"
                name="currency"
                required
                defaultValue="ILS"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="ILS">ILS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="website_url" className="mb-1 block text-xs font-medium text-slate-400">
                {t.website}
              </label>
              <input
                id="website_url"
                name="website_url"
                type="url"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="https://"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                {t.addBtn}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-md font-medium text-slate-200">{t.listTitle}</h3>
        {subscriptions.length === 0 ? (
          <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
            {t.empty}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colName}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colJob}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colFee}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colRenewal}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colWebsite}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.open}</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-100">{s.name}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {s.job ? formatJobLabel(s.job) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">
                      {formatMoneyWithCurrency(s.fee_amount, s.currency, obfuscate)}
                      <span className="ml-1 text-xs text-slate-500">
                        ({s.billing_interval === "annual" ? t.annual : t.monthly})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {s.billing_interval === "annual" && s.renewal_date
                        ? formatHouseholdDate(s.renewal_date, dateDisplayFormat)
                        : s.billing_interval === "monthly" && s.monthly_day_of_month
                          ? `Day ${s.monthly_day_of_month}`
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {s.website_url ? (
                        <a
                          href={s.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:text-sky-300"
                        >
                          {t.open}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/subscriptions/${s.id}`}
                        className="text-sky-400 hover:text-sky-300"
                      >
                        {t.open}
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
  );
}
