import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { EntityUrlsPanel } from "@/components/entity-urls-panel";
import { formatHouseholdDate } from "@/lib/household-date-format";
import {
  getInsurancePolicyTypeLabel,
  INSURANCE_POLICY_TYPE_VALUES,
} from "@/lib/insurance-policy-type-labels";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import {
  createInsurancePolicy,
  toggleInsurancePolicyActive,
  updateInsurancePolicy,
} from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    urls?: string;
  }>;
};

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

export default async function InsurancePoliciesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const lang: "en" | "he" = isHebrew ? "he" : "en";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [policies, cars, familyMembers] = await Promise.all([
    prisma.insurance_policies.findMany({
      where: { household_id: householdId },
      include: { car: true, family_member: true },
      orderBy: { expiration_date: "asc" },
    }),
    prisma.cars.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ maker: "asc" }, { model: "asc" }],
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

  const insuranceListRedirect = "/dashboard/insurance-policies";

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div>
            <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
              {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">
              {isHebrew ? "פוליסות ביטוח" : "Insurance policies"}
            </h1>
            <p className="text-sm text-slate-400">
              {isHebrew
                ? "ביטוח רכב (מקושר לרכב) או ביטוח אחר עם ספק, מספר פוליסה, פרמיה ותאריך חידוש."
                : "Car insurance (linked to a vehicle) or other coverage: provider, optional policy number, premium, and renewal."}
            </p>
            <p className="text-xs text-slate-500">
              <Link href="/dashboard/savings-policies" className="text-sky-400 hover:text-sky-300">
                {isHebrew ? "חסכונות ותוכניות חיסכון ←" : "→ Savings policies"}
              </Link>
            </p>
          </div>
          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.error ||
            resolvedSearchParams?.urls === "1") && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams?.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              <span>
                {resolvedSearchParams?.error
                  ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                  : resolvedSearchParams?.urls === "1"
                    ? isHebrew
                      ? "קישורים עודכנו."
                      : "Links updated."
                    : resolvedSearchParams?.created
                      ? isHebrew
                        ? "הפוליסה נוספה."
                        : "Insurance policy added."
                      : isHebrew
                        ? "עודכן."
                        : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "הוספה חדשה" : "Add new"}</h2>
          <form
            action={createInsurancePolicy}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <input type="hidden" name="insurance_form_context" value="main" />
            <div>
              <label htmlFor="policy_type" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "סוג ביטוח" : "Policy type"} <span className="text-rose-400">*</span>
              </label>
              <select
                id="policy_type"
                name="policy_type"
                required
                defaultValue="car"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                {INSURANCE_POLICY_TYPE_VALUES.map((t) => (
                  <option key={t} value={t}>
                    {getInsurancePolicyTypeLabel(t, lang)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="car_id" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "רכב (ביטוח רכב בלבד)" : "Car (car insurance only)"}
              </label>
              <select
                id="car_id"
                name="car_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                disabled={cars.length === 0}
              >
                <option value="">{isHebrew ? "ללא / לא רלוונטי" : "None / N/A"}</option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.maker} {car.model}
                    {car.plate_number ? ` (${car.plate_number})` : ""}
                    {car.custom_name ? ` — ${car.custom_name}` : ""}
                  </option>
                ))}
              </select>
              {cars.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  {isHebrew ? "הוסיפו רכב תחת " : "Add a vehicle under "}
                  <Link href="/dashboard/cars" className="text-sky-400 hover:text-sky-300">
                    {isHebrew ? "רכבים" : "Cars"}
                  </Link>
                  {isHebrew ? " לביטוח רכב." : " for car insurance."}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "בן משפחה (בעל פוליסה, אופציונלי)" : "Policy holder (optional)"}
              </label>
              <select
                id="family_member_id"
                name="family_member_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{isHebrew ? "לא הוגדר" : "Not set"}</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="provider_name" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "ספק" : "Provider"} <span className="text-rose-400">*</span>
              </label>
              <input
                id="provider_name"
                name="provider_name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "למשל הראל" : "e.g. Harel"}
              />
            </div>
            <div>
              <label htmlFor="policy_name" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "שם הפוליסה" : "Policy name"} <span className="text-rose-400">*</span>
              </label>
              <input
                id="policy_name"
                name="policy_name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "למשל מקיף" : "e.g. Comprehensive"}
              />
            </div>
            <div>
              <label htmlFor="policy_number" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "מספר פוליסה" : "Policy number"}
              </label>
              <input
                id="policy_number"
                name="policy_number"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "אופציונלי" : "Optional"}
              />
            </div>
            <div>
              <label htmlFor="contact_phone" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "טלפון ליצירת קשר" : "Contact phone"}
              </label>
              <input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "אופציונלי" : "Optional"}
              />
            </div>
            <div>
              <label htmlFor="contact_email" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "אימייל ליצירת קשר" : "Contact email"}
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "אופציונלי" : "Optional"}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="website_url" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "אתר אינטרנט" : "Website"}
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
                {isHebrew ? "תאריך התחלה" : "Policy start"} <span className="text-rose-400">*</span>
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
                {isHebrew ? "תאריך תפוגה / חידוש" : "Expiration / renewal date"}{" "}
                <span className="text-rose-400">*</span>
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
                {isHebrew ? "פרמיה ששולמה" : "Premium paid"} <span className="text-rose-400">*</span>
              </label>
              <input
                id="premium_paid"
                name="premium_paid"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="premium_currency" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "מטבע" : "Currency"} <span className="text-rose-400">*</span>
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
            <div className="flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-1">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                {isHebrew ? "הוספת פוליסה" : "Add policy"}
              </button>
            </div>
          </form>
          <p className="text-xs text-slate-500">
            {isHebrew
              ? "לביטוח רכב יש לבחור סוג «רכב» ורכב. לשאר הסוגים השאירו את שדה הרכב ריק."
              : 'For car insurance, choose type "Car" and select a vehicle. For other types, leave Car as "None".'}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "רשימה" : "List"}</h2>
          {policies.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {isHebrew ? "אין עדיין פוליסות. הוסיפו למעלה." : "No insurance policies yet. Add one above."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "סוג" : "Type"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "רכב / בעלים" : "Car / holder"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "ספק" : "Provider"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "פוליסה" : "Policy"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "התחלה" : "Start"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "פרמיה" : "Premium"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "תפוגה" : "Expires"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "סטטוס" : "Status"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "פעולות" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <Fragment key={p.id}>
                      <tr className="border-b border-slate-700/80 hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-300">
                          {getInsurancePolicyTypeLabel(p.policy_type, lang)}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {p.car ? (
                            <Link
                              href={`/dashboard/cars/${p.car_id}`}
                              className="text-sky-400 hover:text-sky-300"
                            >
                              {p.car.maker} {p.car.model}
                              {p.car.plate_number ? ` (${p.car.plate_number})` : ""}
                            </Link>
                          ) : p.family_member ? (
                            <span className="text-slate-300">{p.family_member.full_name}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-100">{p.provider_name}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {p.policy_name}
                          {p.policy_number ? (
                            <span className="block text-xs text-slate-500">#{p.policy_number}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {formatHouseholdDate(p.policy_start_date, dateDisplayFormat)}
                        </td>
                        <td className="px-4 py-3 text-slate-300 tabular-nums">
                          {formatPremium(p.premium_paid, p.premium_currency)}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {formatHouseholdDate(p.expiration_date, dateDisplayFormat)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={p.is_active ? "text-emerald-400" : "text-slate-500"}>
                            {p.is_active
                              ? isHebrew
                                ? "פעיל"
                                : "Active"
                              : isHebrew
                                ? "לא פעיל"
                                : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <form action={toggleInsurancePolicyActive} className="inline">
                            <input type="hidden" name="policy_id" value={p.id} />
                            <input type="hidden" name="next_active" value={p.is_active ? "0" : "1"} />
                            <input type="hidden" name="insurance_form_context" value="main" />
                            <button type="submit" className="text-xs font-medium text-sky-400 hover:text-sky-300">
                              {p.is_active
                                ? isHebrew
                                  ? "השבתה"
                                  : "Deactivate"
                                : isHebrew
                                  ? "הפעלה"
                                  : "Activate"}
                            </button>
                          </form>
                        </td>
                      </tr>
                      <tr className="border-b border-slate-700/80 bg-slate-950/30">
                        <td colSpan={9} className="px-4 py-3">
                          <EntityUrlsPanel
                            entityKind="insurance_policy"
                            entityId={p.id}
                            redirectTo={insuranceListRedirect}
                            urls={urlsByInsurancePolicyId.get(p.id) ?? []}
                            isHebrew={isHebrew}
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-slate-700/80 bg-slate-900/40">
                        <td colSpan={9} className="px-4 py-4">
                          <p className="mb-3 text-xs font-medium text-slate-400">
                            {isHebrew ? "עריכת פוליסה" : "Edit policy"}
                          </p>
                          <form
                            action={updateInsurancePolicy}
                            className="grid gap-3 rounded-lg border border-slate-700/80 bg-slate-950/50 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                          >
                            <input type="hidden" name="insurance_form_context" value="main" />
                            <input type="hidden" name="policy_id" value={p.id} />
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-400">
                                {isHebrew ? "סוג ביטוח" : "Policy type"}{" "}
                                <span className="text-rose-400">*</span>
                              </label>
                              <select
                                name="policy_type"
                                required
                                defaultValue={p.policy_type}
                                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                              >
                                {INSURANCE_POLICY_TYPE_VALUES.map((t) => (
                                  <option key={t} value={t}>
                                    {getInsurancePolicyTypeLabel(t, lang)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-400">
                                {isHebrew ? "רכב (ביטוח רכב בלבד)" : "Car (car only)"}
                              </label>
                              <select
                                name="car_id"
                                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                                disabled={cars.length === 0}
                                defaultValue={p.car_id ?? ""}
                              >
                                <option value="">{isHebrew ? "ללא" : "None"}</option>
                                {cars.map((car) => (
                                  <option key={car.id} value={car.id}>
                                    {car.maker} {car.model}
                                    {car.plate_number ? ` (${car.plate_number})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-400">
                                {isHebrew ? "בן משפחה (אופציונלי)" : "Policy holder (optional)"}
                              </label>
                              <select
                                name="family_member_id"
                                defaultValue={p.family_member_id ?? ""}
                                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                              >
                                <option value="">{isHebrew ? "לא הוגדר" : "Not set"}</option>
                                {familyMembers.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.full_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-400">
                                {isHebrew ? "ספק" : "Provider"} <span className="text-rose-400">*</span>
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
                                {isHebrew ? "שם הפוליסה" : "Policy name"}{" "}
                                <span className="text-rose-400">*</span>
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
                                {isHebrew ? "מספר פוליסה" : "Policy number"}
                              </label>
                              <input
                                name="policy_number"
                                defaultValue={p.policy_number ?? ""}
                                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-400">
                                {isHebrew ? "טלפון" : "Contact phone"}
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
                                {isHebrew ? "אימייל" : "Contact email"}
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
                                {isHebrew ? "אתר" : "Website"}
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
                                {isHebrew ? "תאריך התחלה" : "Policy start"}{" "}
                                <span className="text-rose-400">*</span>
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
                                {isHebrew ? "תאריך חידוש" : "Renewal / expiration"}{" "}
                                <span className="text-rose-400">*</span>
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
                                {isHebrew ? "פרמיה" : "Premium"}{" "}
                                <span className="text-rose-400">*</span>
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
                                {isHebrew ? "מטבע" : "Currency"}{" "}
                                <span className="text-rose-400">*</span>
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
                                {isHebrew ? "שמירה" : "Save changes"}
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
    </div>
  );
}
