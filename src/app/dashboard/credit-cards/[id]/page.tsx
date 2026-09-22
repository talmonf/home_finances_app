import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { HouseholdDateField } from "@/components/household-date-field";
import { SensitiveTextInput, SensitiveTextarea } from "@/components/sensitive-fields";
import { utcDateToHtmlDateInputValue } from "@/lib/household-date-format";
import { maskSensitiveText } from "@/lib/privacy-display";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateCreditCard } from "../actions";
import ExpiryMonthYearInput from "../ExpiryMonthYearInput";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

function formatExpiryMonthYear(d: Date | null) {
  if (!d) return "";
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const year = `${d.getFullYear()}`.slice(-2);
  return `${month}/${year}`;
}

export default async function EditCreditCardPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const isHebrew = uiLanguage === "he";

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [card, familyMembers, bankAccounts] = await Promise.all([
    prisma.credit_cards.findFirst({
      where: { id, household_id: householdId },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { account_name: "asc" },
    }),
  ]);

  if (!card) {
    redirect("/dashboard/credit-cards?error=Not+found");
  }

  const dateInputClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-screen-2xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/credit-cards"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה לכרטיסי אשראי →" : "← Back to credit cards"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{isHebrew ? "עריכת כרטיס אשראי" : "Edit credit card"}</h1>

          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
            </div>
          )}
        </header>

        <form
          action={updateCreditCard}
          className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="id" value={card.id} />

          <div>
            <label htmlFor="card_name" className="mb-1 block text-xs font-medium text-slate-400">
              Card
            </label>
            <SensitiveTextInput
              obfuscate={obfuscate}
              id="card_name"
              name="card_name"
              required
              value={card.card_name}
              className={dateInputClass}
            />
          </div>
          <div>
            <label htmlFor="scheme" className="mb-1 block text-xs font-medium text-slate-400">
              Scheme
            </label>
            <select
              id="scheme"
              name="scheme"
              required
              defaultValue={card.scheme}
              className={dateInputClass}
            >
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="amex">Amex</option>
              <option value="diners_club">Diners Club</option>
              <option value="isracard">Isracard</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="issuer_name" className="mb-1 block text-xs font-medium text-slate-400">
              Issuer
            </label>
            <SensitiveTextInput
              obfuscate={obfuscate}
              id="issuer_name"
              name="issuer_name"
              required
              value={card.issuer_name}
              className={dateInputClass}
            />
          </div>
          <div>
            <label htmlFor="co_brand" className="mb-1 block text-xs font-medium text-slate-400">
              Co-brand (optional)
            </label>
            <SensitiveTextInput
              obfuscate={obfuscate}
              id="co_brand"
              name="co_brand"
              value={card.co_brand ?? ""}
              className={dateInputClass}
            />
          </div>
          <div>
            <label htmlFor="product_name" className="mb-1 block text-xs font-medium text-slate-400">
              Product name (optional)
            </label>
            <SensitiveTextInput
              obfuscate={obfuscate}
              id="product_name"
              name="product_name"
              value={card.product_name ?? ""}
              className={dateInputClass}
            />
          </div>
          <div>
            <label htmlFor="card_last_four" className="mb-1 block text-xs font-medium text-slate-400">
              Last 4 digits
            </label>
            <SensitiveTextInput
              obfuscate={obfuscate}
              id="card_last_four"
              name="card_last_four"
              required
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={card.card_last_four}
              className={dateInputClass}
            />
          </div>
          <div>
            <label
              htmlFor="digital_wallet_identifier"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Digital Wallet identifier (optional)
            </label>
            <SensitiveTextInput
              obfuscate={obfuscate}
              id="digital_wallet_identifier"
              name="digital_wallet_identifier"
              value={card.digital_wallet_identifier ?? ""}
              className={dateInputClass}
              placeholder="e.g. GooglePay 9952"
            />
          </div>
          <div>
            <label htmlFor="charge_day_of_month" className="mb-1 block text-xs font-medium text-slate-400">
              Charge day of month (optional)
            </label>
            <input
              id="charge_day_of_month"
              name="charge_day_of_month"
              type="number"
              min="1"
              max="31"
              step="1"
              defaultValue={card.charge_day_of_month ?? ""}
              className={dateInputClass}
              placeholder="e.g. 2"
            />
          </div>
          <div>
            <label htmlFor="monthly_cost" className="mb-1 block text-xs font-medium text-slate-400">
              Monthly cost
            </label>
            <SensitiveTextInput
              obfuscate={obfuscate}
              id="monthly_cost"
              name="monthly_cost"
              type="number"
              min="0"
              step="0.01"
              value={card.monthly_cost == null ? "" : Number(card.monthly_cost)}
              className={dateInputClass}
              placeholder="Leave blank if unknown"
            />
          </div>
          <div>
            <label htmlFor="currency" className="mb-1 block text-xs font-medium text-slate-400">
              Currency
            </label>
            <input
              id="currency"
              name="currency"
              defaultValue={card.currency}
              className={dateInputClass}
            />
          </div>
          <div>
            <label htmlFor="issue_date" className="mb-1 block text-xs font-medium text-slate-400">
              Issue date (optional)
            </label>
            <HouseholdDateField
              id="issue_date"
              name="issue_date"
              defaultIsoYmd={utcDateToHtmlDateInputValue(card.issue_date)}
              className={dateInputClass}
            />
          </div>
          <div>
            <label htmlFor="expiry_month_year" className="mb-1 block text-xs font-medium text-slate-400">
              Expiry (MM/YY)
            </label>
            <ExpiryMonthYearInput
              id="expiry_month_year"
              name="expiry_month_year"
              required
              placeholder="MM/YY"
              defaultValue={formatExpiryMonthYear(card.expiry_date)}
              className={dateInputClass}
            />
          </div>
          <div>
            <label htmlFor="no_charge_policy_valid_until" className="mb-1 block text-xs font-medium text-slate-400">
              No-charge policy valid until
            </label>
            <HouseholdDateField
              id="no_charge_policy_valid_until"
              name="no_charge_policy_valid_until"
              defaultIsoYmd={utcDateToHtmlDateInputValue(card.no_charge_policy_valid_until)}
              className={dateInputClass}
            />
          </div>
          <div>
            <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
              Family member
            </label>
            <select
              id="family_member_id"
              name="family_member_id"
              required
              defaultValue={card.family_member_id ?? ""}
              className={dateInputClass}
            >
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {maskSensitiveText(obfuscate, m.full_name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="settlement_bank_account_id" className="mb-1 block text-xs font-medium text-slate-400">
              Settlement bank account
            </label>
            <select
              id="settlement_bank_account_id"
              name="settlement_bank_account_id"
              defaultValue={card.settlement_bank_account_id ?? ""}
              className={dateInputClass}
            >
              <option value="">None</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {maskSensitiveText(obfuscate, `${a.account_name} (${a.bank_name})`)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-400">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={card.cancelled_at ? "cancelled" : "active"}
              className={dateInputClass}
            >
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label htmlFor="cancelled_at" className="mb-1 block text-xs font-medium text-slate-400">
              Cancellation date
            </label>
            <HouseholdDateField
              id="cancelled_at"
              name="cancelled_at"
              defaultIsoYmd={utcDateToHtmlDateInputValue(card.cancelled_at)}
              className={dateInputClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="website_url" className="mb-1 block text-xs font-medium text-slate-400">
              Website / URL
            </label>
            <SensitiveTextInput
              obfuscate={obfuscate}
              id="website_url"
              name="website_url"
              value={card.website_url ?? ""}
              className={dateInputClass}
              placeholder="Optional"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
              Notes
            </label>
            <SensitiveTextarea
              obfuscate={obfuscate}
              id="notes"
              name="notes"
              rows={3}
              value={card.notes ?? ""}
              className={dateInputClass}
              placeholder="Required when status is Cancelled"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              {isHebrew ? "שמירת שינויים" : "Save changes"}
            </button>
            <Link
              href={`/dashboard/credit-cards?modal=new&cloneFrom=${encodeURIComponent(card.id)}`}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-slate-700"
            >
              {isHebrew ? "שכפול כרטיס" : "Clone card"}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
