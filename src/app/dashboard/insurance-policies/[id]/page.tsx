import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
  getHouseholdShowEntityUrlPanels,
} from "@/lib/auth";
import { EntityUrlsPanel } from "@/components/entity-urls-panel";
import { formatHouseholdDate } from "@/lib/household-date-format";
import {
  getInsurancePolicyTypeLabel,
  INSURANCE_POLICY_TYPE_VALUES,
} from "@/lib/insurance-policy-type-labels";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  toggleInsurancePolicyActive,
  updateInsurancePolicy,
} from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    updated?: string;
    error?: string;
    urls?: string;
  }>;
};

function toDateInputValue(d: Date) {
  const z = new Date(d);
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, "0");
  const day = String(z.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function EditInsurancePolicyPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const showEntityUrlPanels = await getHouseholdShowEntityUrlPanels();
  const isHebrew = uiLanguage === "he";
  const lang: "en" | "he" = isHebrew ? "he" : "en";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const { id } = await params;

  const [policy, cars, familyMembers] = await Promise.all([
    prisma.insurance_policies.findFirst({
      where: { id, household_id: householdId },
      include: { car: true, family_member: true },
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

  if (!policy) {
    redirect("/dashboard/insurance-policies?error=Policy+not+found");
  }

  const insuranceEntityUrls =
    !showEntityUrlPanels
      ? []
      : await prisma.entity_urls.findMany({
          where: {
            household_id: householdId,
            entity_kind: "insurance_policy",
            entity_id: id,
          },
          orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        });

  const detailPath = `/dashboard/insurance-policies/${id}`;

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div>
            <Link
              href="/dashboard/insurance-policies"
              className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
            >
              {isHebrew ? "חזרה לפוליסות ביטוח →" : "← Back to insurance policies"}
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">
              {isHebrew ? "עריכת פוליסת ביטוח" : "Edit insurance policy"}
            </h1>
            <p className="text-sm text-slate-400">
              {policy.provider_name} — {policy.policy_name}
            </p>
            <p className="text-xs text-slate-500">
              {isHebrew ? "תפוגה" : "Expires"}:{" "}
              <span className="text-slate-400">
                {formatHouseholdDate(policy.expiration_date, dateDisplayFormat)}
              </span>
            </p>
          </div>

          {(resolvedSearchParams?.updated ||
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
                    : isHebrew
                      ? "עודכן."
                      : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "פרטים" : "Details"}</h2>
            <form action={toggleInsurancePolicyActive} className="inline">
              <input type="hidden" name="policy_id" value={policy.id} />
              <input type="hidden" name="next_active" value={policy.is_active ? "0" : "1"} />
              <input type="hidden" name="insurance_form_context" value="main" />
              <input type="hidden" name="post_save_redirect" value={detailPath} />
              <button type="submit" className="text-sm font-medium text-sky-400 hover:text-sky-300">
                {policy.is_active
                  ? isHebrew
                    ? "השבתת פוליסה"
                    : "Deactivate policy"
                  : isHebrew
                    ? "הפעלת פוליסה"
                    : "Activate policy"}
              </button>
            </form>
          </div>

          <form
            action={updateInsurancePolicy}
            className="grid gap-3 rounded-lg border border-slate-700/80 bg-slate-950/50 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <input type="hidden" name="insurance_form_context" value="main" />
            <input type="hidden" name="policy_id" value={policy.id} />
            <input type="hidden" name="post_save_redirect" value={detailPath} />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "סוג ביטוח" : "Policy type"} <span className="text-rose-400">*</span>
              </label>
              <select
                name="policy_type"
                required
                defaultValue={policy.policy_type}
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
                defaultValue={policy.car_id ?? ""}
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
                defaultValue={policy.family_member_id ?? ""}
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
                defaultValue={policy.provider_name}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "שם הפוליסה" : "Policy name"} <span className="text-rose-400">*</span>
              </label>
              <input
                name="policy_name"
                required
                defaultValue={policy.policy_name}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "מספר פוליסה" : "Policy number"}
              </label>
              <input
                name="policy_number"
                defaultValue={policy.policy_number ?? ""}
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
                defaultValue={policy.contact_phone ?? ""}
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
                defaultValue={policy.contact_email ?? ""}
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
                defaultValue={policy.website_url ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "תאריך התחלה" : "Policy start"} <span className="text-rose-400">*</span>
              </label>
              <input
                name="policy_start_date"
                type="date"
                required
                defaultValue={toDateInputValue(policy.policy_start_date)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "תאריך חידוש" : "Renewal / expiration"} <span className="text-rose-400">*</span>
              </label>
              <input
                name="expiration_date"
                type="date"
                required
                defaultValue={toDateInputValue(policy.expiration_date)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "פרמיה" : "Premium"} <span className="text-rose-400">*</span>
              </label>
              <input
                name="premium_paid"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={policy.premium_paid.toString()}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "מטבע" : "Currency"} <span className="text-rose-400">*</span>
              </label>
              <select
                name="premium_currency"
                required
                defaultValue={policy.premium_currency}
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
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                {isHebrew ? "שמירה" : "Save changes"}
              </button>
            </div>
          </form>
          <p className="text-xs text-slate-500">
            {isHebrew
              ? "לביטוח רכב יש לבחור סוג «רכב» ורכב. לשאר הסוגים השאירו את שדה הרכב ריק."
              : 'For car insurance, choose type "Car" and select a vehicle. For other types, leave Car as "None".'}
          </p>
        </section>

        {showEntityUrlPanels ? (
          <section>
            <EntityUrlsPanel
              entityKind="insurance_policy"
              entityId={id}
              redirectTo={detailPath}
              urls={insuranceEntityUrls}
              isHebrew={isHebrew}
              addLinkHref={`${detailPath}/links/new`}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
