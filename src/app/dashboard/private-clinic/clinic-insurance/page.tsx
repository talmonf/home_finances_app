import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { EntityUrlsPanel } from "@/components/entity-urls-panel";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { getInsurancePolicyTypeLabel } from "@/lib/insurance-policy-type-labels";
import { CLINIC_INSURANCE_POLICY_TYPES } from "@/lib/private-clinic/constants";
import { privateClinicClinicInsurance } from "@/lib/private-clinic-i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import {
  createInsurancePolicy,
  toggleInsurancePolicyActive,
  updateInsurancePolicy,
} from "@/app/dashboard/insurance-policies/actions";

export const dynamic = "force-dynamic";

function formatPremium(paid: { toString(): string }, currency: string) {
  const n = Number(paid.toString());
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function toDateInputValue(d: Date) {
  const z = new Date(d);
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, "0");
  const day = String(z.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    urls?: string;
  }>;
};

export default async function ClinicInsurancePage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const lang: "en" | "he" = isHebrew ? "he" : "en";
  const t = privateClinicClinicInsurance(uiLanguage);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [policies, familyMembers] = await Promise.all([
    prisma.insurance_policies.findMany({
      where: { household_id: householdId, policy_type: { in: [...CLINIC_INSURANCE_POLICY_TYPES] } },
      include: { car: true, family_member: true },
      orderBy: { expiration_date: "asc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  const policyIds = policies.map((p) => p.id);
  const insuranceEntityUrls =
    policyIds.length === 0
      ? []
      : await prisma.entity_urls.findMany({
          where: {
            household_id: householdId,
            entity_kind: "insurance_policy",
            entity_id: { in: policyIds },
          },
          orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        });
  const urlsByInsurancePolicyId = new Map<string, typeof insuranceEntityUrls>();
  for (const u of insuranceEntityUrls) {
    const list = urlsByInsurancePolicyId.get(u.entity_id) ?? [];
    list.push(u);
    urlsByInsurancePolicyId.set(u.entity_id, list);
  }

  const listRedirect = "/dashboard/private-clinic/clinic-insurance";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-lg font-medium text-slate-200">{t.title}</h2>
        <p className="text-sm text-slate-400">{t.blurb}</p>
        <p className="text-xs text-slate-500">
          <Link href="/dashboard/insurance-policies" className="text-sky-400 hover:text-sky-300">
            {t.allHouseholdPolicies}
          </Link>
        </p>
      </header>

      {(resolvedSearchParams?.created ||
        resolvedSearchParams?.updated ||
        resolvedSearchParams?.error ||
        resolvedSearchParams?.urls === "1") && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            resolvedSearchParams?.error
              ? "border-rose-600 bg-rose-950/60 text-rose-100"
              : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
          }`}
        >
          {resolvedSearchParams?.error
            ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
            : resolvedSearchParams?.urls === "1"
              ? t.urlsUpdated
              : resolvedSearchParams?.created
                ? t.created
                : t.updated}
        </div>
      )}

      <section className="space-y-4">
        <h3 className="text-md font-medium text-slate-200">{t.addTitle}</h3>
        <form
          action={createInsurancePolicy}
          className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <input type="hidden" name="insurance_form_context" value="clinic" />
          <div>
            <label htmlFor="policy_type" className="mb-1 block text-xs font-medium text-slate-400">
              {t.policyType} <span className="text-rose-400">*</span>
            </label>
            <select
              id="policy_type"
              name="policy_type"
              required
              defaultValue="professional_liability"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {CLINIC_INSURANCE_POLICY_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {getInsurancePolicyTypeLabel(pt, lang)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
              {t.policyHolderOptional}
            </label>
            <select
              id="family_member_id"
              name="family_member_id"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{t.notSet}</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="provider_name" className="mb-1 block text-xs font-medium text-slate-400">
              {t.provider} <span className="text-rose-400">*</span>
            </label>
            <input
              id="provider_name"
              name="provider_name"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="policy_name" className="mb-1 block text-xs font-medium text-slate-400">
              {t.policyName} <span className="text-rose-400">*</span>
            </label>
            <input
              id="policy_name"
              name="policy_name"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="policy_number" className="mb-1 block text-xs font-medium text-slate-400">
              {t.policyNumber}
            </label>
            <input
              id="policy_number"
              name="policy_number"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="contact_phone" className="mb-1 block text-xs font-medium text-slate-400">
              {t.contactPhone}
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              type="tel"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="contact_email" className="mb-1 block text-xs font-medium text-slate-400">
              {t.contactEmail}
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
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
          <div>
            <label htmlFor="policy_start_date" className="mb-1 block text-xs font-medium text-slate-400">
              {t.startDate} <span className="text-rose-400">*</span>
            </label>
            <input
              id="policy_start_date"
              name="policy_start_date"
              type="date"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="expiration_date" className="mb-1 block text-xs font-medium text-slate-400">
              {t.renewalDate} <span className="text-rose-400">*</span>
            </label>
            <input
              id="expiration_date"
              name="expiration_date"
              type="date"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="premium_paid" className="mb-1 block text-xs font-medium text-slate-400">
              {t.annualPremium} <span className="text-rose-400">*</span>
            </label>
            <input
              id="premium_paid"
              name="premium_paid"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="premium_currency" className="mb-1 block text-xs font-medium text-slate-400">
              {t.currency} <span className="text-rose-400">*</span>
            </label>
            <select
              id="premium_currency"
              name="premium_currency"
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
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {t.addPolicy}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h3 className="text-md font-medium text-slate-200">{t.listTitle}</h3>
        {policies.length === 0 ? (
          <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
            {t.empty}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colType}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colProvider}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colPolicy}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colAnnual}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colRenewal}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colStatus}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <Fragment key={p.id}>
                    <tr className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-300">
                        {getInsurancePolicyTypeLabel(p.policy_type, lang)}
                      </td>
                      <td className="px-4 py-3 text-slate-100">{p.provider_name}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {p.policy_name}
                        {p.policy_number ? (
                          <span className="block text-xs text-slate-500">#{p.policy_number}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">
                        {formatPremium(p.premium_paid, p.premium_currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatHouseholdDate(p.expiration_date, dateDisplayFormat)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={p.is_active ? "text-emerald-400" : "text-slate-500"}>
                          {p.is_active ? t.statusActive : t.statusInactive}
                        </span>
                      </td>
                        <td className="px-4 py-3">
                        <form action={toggleInsurancePolicyActive} className="inline">
                          <input type="hidden" name="policy_id" value={p.id} />
                          <input type="hidden" name="next_active" value={p.is_active ? "0" : "1"} />
                          <input type="hidden" name="insurance_form_context" value="clinic" />
                          <button type="submit" className="text-xs font-medium text-sky-400 hover:text-sky-300">
                            {p.is_active ? t.deactivate : t.activate}
                          </button>
                        </form>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-700/80 bg-slate-950/30">
                      <td colSpan={7} className="px-4 py-3">
                        <EntityUrlsPanel
                          entityKind="insurance_policy"
                          entityId={p.id}
                          redirectTo={listRedirect}
                          urls={urlsByInsurancePolicyId.get(p.id) ?? []}
                          isHebrew={isHebrew}
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-slate-700/80 bg-slate-900/40">
                      <td colSpan={7} className="px-4 py-4">
                        <p className="mb-3 text-xs font-medium text-slate-400">{t.editPolicy}</p>
                        <form
                          action={updateInsurancePolicy}
                          className="grid gap-3 rounded-lg border border-slate-700/80 bg-slate-950/50 p-4 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          <input type="hidden" name="insurance_form_context" value="clinic" />
                          <input type="hidden" name="policy_id" value={p.id} />
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.policyType} <span className="text-rose-400">*</span>
                            </label>
                            <select
                              name="policy_type"
                              required
                              defaultValue={p.policy_type}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            >
                              {CLINIC_INSURANCE_POLICY_TYPES.map((pt) => (
                                <option key={pt} value={pt}>
                                  {getInsurancePolicyTypeLabel(pt, lang)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.policyHolderOptional}
                            </label>
                            <select
                              name="family_member_id"
                              defaultValue={p.family_member_id ?? ""}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            >
                              <option value="">{t.notSet}</option>
                              {familyMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.provider} <span className="text-rose-400">*</span>
                            </label>
                            <input
                              name="provider_name"
                              required
                              defaultValue={p.provider_name}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.policyName} <span className="text-rose-400">*</span>
                            </label>
                            <input
                              name="policy_name"
                              required
                              defaultValue={p.policy_name}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.policyNumber}
                            </label>
                            <input
                              name="policy_number"
                              defaultValue={p.policy_number ?? ""}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.contactPhone}
                            </label>
                            <input
                              name="contact_phone"
                              type="tel"
                              defaultValue={p.contact_phone ?? ""}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.contactEmail}
                            </label>
                            <input
                              name="contact_email"
                              type="email"
                              defaultValue={p.contact_email ?? ""}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.website}
                            </label>
                            <input
                              name="website_url"
                              type="url"
                              defaultValue={p.website_url ?? ""}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.startDate} <span className="text-rose-400">*</span>
                            </label>
                            <input
                              name="policy_start_date"
                              type="date"
                              required
                              defaultValue={toDateInputValue(p.policy_start_date)}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.renewalDate} <span className="text-rose-400">*</span>
                            </label>
                            <input
                              name="expiration_date"
                              type="date"
                              required
                              defaultValue={toDateInputValue(p.expiration_date)}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.annualPremium} <span className="text-rose-400">*</span>
                            </label>
                            <input
                              name="premium_paid"
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              defaultValue={p.premium_paid.toString()}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              {t.currency} <span className="text-rose-400">*</span>
                            </label>
                            <select
                              name="premium_currency"
                              required
                              defaultValue={p.premium_currency}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                            >
                              <option value="ILS">ILS</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="submit"
                              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                            >
                              {t.save}
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
