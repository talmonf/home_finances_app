import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { HouseholdDateField } from "@/components/household-date-field";
import { SensitiveTextInput, SensitiveTextarea } from "@/components/sensitive-fields";
import { formatCreditCardOptionLabel } from "@/lib/credit-card-label";
import { formatHouseholdDate, utcDateToHtmlDateInputValue } from "@/lib/household-date-format";
import { includeById, insurancePaymentMethodValue } from "@/lib/insurance-policy-payment";
import {
  getInsurancePolicyTypeLabel,
  INSURANCE_POLICY_TYPE_VALUES,
} from "@/lib/insurance-policy-type-labels";
import { maskSensitiveAmount, maskSensitiveText } from "@/lib/privacy-display";
import { ProxiedFileOpenDownloadLinks } from "@/components/file-open-download-links";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardAddButton } from "@/components/dashboard-add-button";
import { DashboardModal } from "@/components/dashboard-modal";
import { UtilityPaymentFields } from "@/app/dashboard/properties/utility-payment-fields";
import { createInsurancePolicy, toggleInsurancePolicyActive } from "./actions";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string) {
  return UUID_RE.test(s);
}

const PREMIUM_CURRENCIES = ["ILS", "USD", "EUR", "GBP"] as const;

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    urls?: string;
    modal?: string;
    cloneFrom?: string;
  }>;
};

function formatPremium(paid: { toString(): string }, currency: string) {
  const n = Number(paid.toString());
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatPolicyPayment(
  policy: {
    payment_method: string | null;
    payment_count: number | null;
    payment_date: Date | null;
    bank_account: { bank_name: string; account_name: string } | null;
    credit_card: {
      card_name: string;
      card_last_four: string;
      family_member?: { full_name: string | null } | null;
    } | null;
  },
  isHebrew: boolean,
  obfuscate: boolean,
  dateDisplayFormat: Parameters<typeof formatHouseholdDate>[1],
): string {
  const date = policy.payment_date
    ? formatHouseholdDate(policy.payment_date, dateDisplayFormat)
    : "";
  if (policy.payment_method === "credit_card" || policy.credit_card) {
    const card = policy.credit_card
      ? maskSensitiveText(obfuscate, formatCreditCardOptionLabel(policy.credit_card))
      : isHebrew
        ? "כרטיס אשראי"
        : "Credit card";
    const count =
      policy.payment_count != null
        ? isHebrew
          ? `${policy.payment_count} תשלומים`
          : `${policy.payment_count} payments`
        : "";
    return [card, count, date].filter(Boolean).join(" · ");
  }
  if (policy.payment_method === "bank_account" || policy.bank_account) {
    const account = policy.bank_account
      ? maskSensitiveText(
          obfuscate,
          `${policy.bank_account.bank_name} · ${policy.bank_account.account_name}`,
        )
      : isHebrew
        ? "העברה בנקאית"
        : "Bank transfer";
    return [account, date].filter(Boolean).join(" · ");
  }
  return "—";
}

export default async function InsurancePoliciesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const isHebrew = uiLanguage === "he";
  const lang: "en" | "he" = isHebrew ? "he" : "en";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const modalMode = resolvedSearchParams?.modal === "new" ? "new" : null;
  const cloneFromId = (resolvedSearchParams?.cloneFrom ?? "").trim();

  const bankAccountSelect = {
    id: true,
    account_name: true,
    bank_name: true,
    account_number: true,
  } as const;
  const creditCardSelect = {
    id: true,
    card_name: true,
    card_last_four: true,
    family_member: { select: { full_name: true } },
  } as const;

  const [policies, cars, familyMembers, bankAccounts, creditCards, cloneSource] = await Promise.all([
    prisma.insurance_policies.findMany({
      where: { household_id: householdId },
      include: {
        car: true,
        family_member: true,
        bank_account: { select: bankAccountSelect },
        credit_card: { select: creditCardSelect },
      },
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
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ bank_name: "asc" }, { account_name: "asc" }],
      select: bankAccountSelect,
    }),
    prisma.credit_cards.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { card_name: "asc" },
      select: creditCardSelect,
    }),
    modalMode === "new" && cloneFromId && isUuid(cloneFromId)
      ? prisma.insurance_policies.findFirst({
          where: { id: cloneFromId, household_id: householdId },
          include: {
            car: true,
            bank_account: { select: bankAccountSelect },
            credit_card: { select: creditCardSelect },
          },
        })
      : Promise.resolve(null),
  ]);

  const carsForForm =
    cloneSource?.car && !cars.some((car) => car.id === cloneSource.car?.id)
      ? [...cars, cloneSource.car]
      : cars;
  const cloneFamilyMemberId =
    cloneSource?.family_member_id &&
    familyMembers.some((member) => member.id === cloneSource.family_member_id)
      ? cloneSource.family_member_id
      : "";
  const bankAccountsForForm = includeById(bankAccounts, cloneSource?.bank_account);
  const creditCardsForForm = includeById(creditCards, cloneSource?.credit_card);
  const premiumCurrency = cloneSource?.premium_currency ?? "ILS";
  const currencyChoices = (PREMIUM_CURRENCIES as readonly string[]).includes(premiumCurrency)
    ? [...PREMIUM_CURRENCIES]
    : [...PREMIUM_CURRENCIES, premiumCurrency];

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-screen-2xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
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
                ? "ביטוח רכב (מקושר לרכב) או ביטוח אחר עם סוכן ביטוח, מספר פוליסה, פרמיה ותאריך חידוש."
                : "Car insurance (linked to a vehicle) or other coverage: insurance agent, optional policy number, premium, and renewal."}
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

        {modalMode === "new" ? (
          <DashboardModal
            title={
              cloneSource
                ? isHebrew
                  ? `שכפול: ${maskSensitiveText(obfuscate, cloneSource.policy_name)}`
                  : `Clone: ${maskSensitiveText(obfuscate, cloneSource.policy_name)}`
                : isHebrew
                  ? "הוספה חדשה"
                  : "Add new"
            }
            closeHref="/dashboard/insurance-policies"
            closeLabel={isHebrew ? "סגירה" : "Close"}
            maxWidthClassName="max-w-screen-2xl"
          >
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
                defaultValue={cloneSource?.policy_type ?? "car"}
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
                disabled={carsForForm.length === 0}
                defaultValue={cloneSource?.car_id ?? ""}
              >
                <option value="">{isHebrew ? "ללא / לא רלוונטי" : "None / N/A"}</option>
                {carsForForm.map((car) => (
                  <option key={car.id} value={car.id}>
                    {maskSensitiveText(
                      obfuscate,
                      `${car.maker} ${car.model}${car.plate_number ? ` (${car.plate_number})` : ""}${car.custom_name ? ` — ${car.custom_name}` : ""}`,
                    )}
                  </option>
                ))}
              </select>
              {carsForForm.length === 0 ? (
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
                defaultValue={cloneFamilyMemberId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{isHebrew ? "לא הוגדר" : "Not set"}</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {maskSensitiveText(obfuscate, m.full_name)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="provider_name" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "סוכן ביטוח" : "Insurance agent"} <span className="text-rose-400">*</span>
              </label>
              <SensitiveTextInput
                id="provider_name"
                name="provider_name"
                required
                obfuscate={obfuscate}
                value={cloneSource?.provider_name ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "למשל שם הסוכן" : "e.g. agent name"}
              />
            </div>
            <div>
              <label htmlFor="insurance_company" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "חברת ביטוח" : "Insurance company"}
              </label>
              <SensitiveTextInput
                id="insurance_company"
                name="insurance_company"
                maxLength={200}
                obfuscate={obfuscate}
                value={cloneSource?.insurance_company ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "אופציונלי" : "Optional"}
              />
            </div>
            <div>
              <label htmlFor="policy_name" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "שם הפוליסה" : "Policy name"} <span className="text-rose-400">*</span>
              </label>
              <SensitiveTextInput
                id="policy_name"
                name="policy_name"
                required
                obfuscate={obfuscate}
                value={cloneSource?.policy_name ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "למשל מקיף" : "e.g. Comprehensive"}
              />
            </div>
            <div>
              <label htmlFor="policy_number" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "מספר פוליסה" : "Policy number"}
              </label>
              <SensitiveTextInput
                id="policy_number"
                name="policy_number"
                obfuscate={obfuscate}
                value={cloneSource?.policy_number ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "אופציונלי" : "Optional"}
              />
            </div>
            <div>
              <label htmlFor="contact_phone" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "טלפון ליצירת קשר" : "Contact phone"}
              </label>
              <SensitiveTextInput
                id="contact_phone"
                name="contact_phone"
                type="tel"
                obfuscate={obfuscate}
                value={cloneSource?.contact_phone ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "אופציונלי" : "Optional"}
              />
            </div>
            <div>
              <label htmlFor="contact_email" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "אימייל ליצירת קשר" : "Contact email"}
              </label>
              <SensitiveTextInput
                id="contact_email"
                name="contact_email"
                type="email"
                obfuscate={obfuscate}
                value={cloneSource?.contact_email ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "אופציונלי" : "Optional"}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="website_url" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "אתר אינטרנט" : "Website"}
              </label>
              <SensitiveTextInput
                id="website_url"
                name="website_url"
                type="url"
                obfuscate={obfuscate}
                value={cloneSource?.website_url ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="https://"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "הערות" : "Notes"}
              </label>
              <SensitiveTextarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={16000}
                obfuscate={obfuscate}
                value={cloneSource?.notes ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder={isHebrew ? "אופציונלי" : "Optional"}
              />
            </div>
            <div>
              <label htmlFor="policy_start_date" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "תאריך התחלה" : "Policy start"} <span className="text-rose-400">*</span>
              </label>
              <HouseholdDateField
                id="policy_start_date"
                name="policy_start_date"
                required
                defaultIsoYmd={utcDateToHtmlDateInputValue(cloneSource?.policy_start_date ?? null)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="expiration_date" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "תאריך תפוגה / חידוש" : "Expiration / renewal date"}{" "}
                <span className="text-rose-400">*</span>
              </label>
              <HouseholdDateField
                id="expiration_date"
                name="expiration_date"
                required
                defaultIsoYmd={utcDateToHtmlDateInputValue(cloneSource?.expiration_date ?? null)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="premium_paid" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "פרמיה ששולמה" : "Premium paid"} <span className="text-rose-400">*</span>
              </label>
              <SensitiveTextInput
                id="premium_paid"
                name="premium_paid"
                type="number"
                step="0.01"
                min="0"
                required
                obfuscate={obfuscate}
                value={cloneSource ? cloneSource.premium_paid.toString() : ""}
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
                defaultValue={premiumCurrency}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                {currencyChoices.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <UtilityPaymentFields
              isHebrew={isHebrew}
              className="grid gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4 sm:grid-cols-2 lg:grid-cols-4"
              bankMethodLabel={isHebrew ? "העברה בנקאית" : "Bank transfer"}
              creditCardMethodLabel={isHebrew ? "כרטיס אשראי" : "Credit card"}
              defaultPaymentMethod={insurancePaymentMethodValue(cloneSource)}
              defaultBankAccountId={cloneSource?.bank_account_id ?? ""}
              defaultCreditCardId={cloneSource?.credit_card_id ?? ""}
              defaultPaymentDate={utcDateToHtmlDateInputValue(cloneSource?.payment_date ?? null)}
              defaultPaymentCount={cloneSource?.payment_count?.toString() ?? ""}
              showPaymentDate
              showPaymentCount
              bankAccounts={bankAccountsForForm.map((account) => ({
                ...account,
                account_name: maskSensitiveText(obfuscate, account.account_name),
                bank_name: maskSensitiveText(obfuscate, account.bank_name),
              }))}
              creditCards={creditCardsForForm}
            />
            <div className="flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-1">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                {cloneSource
                  ? isHebrew
                    ? "שכפול פוליסה"
                    : "Clone policy"
                  : isHebrew
                    ? "הוספת פוליסה"
                    : "Add policy"}
              </button>
            </div>
            </form>
            <p className="text-xs text-slate-500">
              {isHebrew
                ? "לביטוח רכב יש לבחור סוג «רכב» ורכב. לשאר הסוגים השאירו את שדה הרכב ריק."
                : 'For car insurance, choose type "Car" and select a vehicle. For other types, leave Car as "None".'}
              {cloneSource
                ? isHebrew
                  ? " הקובץ המצורף אינו מועתק."
                  : " The attached document is not copied."
                : ""}
            </p>
          </DashboardModal>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "רשימה" : "List"}</h2>
            <DashboardAddButton
              basePath="/dashboard/insurance-policies"
              label={isHebrew ? "הוספת פוליסה" : "Add policy"}
            />
          </div>
          {policies.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {isHebrew ? "אין עדיין פוליסות. הוסיפו למעלה." : "No insurance policies yet. Add one above."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "סוג" : "Type"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "רכב / בעלים" : "Car / holder"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "סוכן ביטוח" : "Insurance agent"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "פוליסה" : "Policy"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "קובץ" : "File"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "התחלה" : "Start"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "פרמיה" : "Premium"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "תשלום" : "Payment"}
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
                  {policies.map((p) => {
                    const carLabel = p.car
                      ? `${p.car.maker} ${p.car.model}${p.car.plate_number ? ` (${p.car.plate_number})` : ""}`
                      : "";
                    return (
                    <tr key={p.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-300">
                        {getInsurancePolicyTypeLabel(p.policy_type, lang)}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {p.car ? (
                          <Link
                            href={`/dashboard/cars/${p.car_id}`}
                            className="text-sky-400 hover:text-sky-300"
                          >
                            {maskSensitiveText(obfuscate, carLabel)}
                          </Link>
                        ) : p.family_member ? (
                          <span className="text-slate-300">
                            {maskSensitiveText(obfuscate, p.family_member.full_name)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-100">
                        {maskSensitiveText(obfuscate, p.provider_name)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {maskSensitiveText(obfuscate, p.policy_name)}
                        {p.policy_number ? (
                          <span className="block text-xs text-slate-500">
                            #{maskSensitiveText(obfuscate, p.policy_number)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {p.policy_storage_key ? (
                          <ProxiedFileOpenDownloadLinks
                            downloadApiPath={`/api/insurance-policies/${p.id}/download`}
                            downloadFileName={p.policy_file_name ?? undefined}
                          />
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatHouseholdDate(p.policy_start_date, dateDisplayFormat)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">
                        {maskSensitiveAmount(
                          obfuscate,
                          formatPremium(p.premium_paid, p.premium_currency),
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatPolicyPayment(p, isHebrew, obfuscate, dateDisplayFormat)}
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
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Link
                            href={`/dashboard/insurance-policies/${p.id}`}
                            className="text-xs font-medium text-sky-400 hover:text-sky-300"
                          >
                            {isHebrew ? "עריכה" : "Edit"}
                          </Link>
                          <Link
                            href={`/dashboard/insurance-policies?modal=new&cloneFrom=${encodeURIComponent(p.id)}`}
                            className="text-xs font-medium text-sky-400 hover:text-sky-300"
                          >
                            {isHebrew ? "שכפול" : "Clone"}
                          </Link>
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
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
