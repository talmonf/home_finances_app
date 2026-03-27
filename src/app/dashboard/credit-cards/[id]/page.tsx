import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateCreditCard } from "../actions";
import ExpiryMonthYearInput from "../ExpiryMonthYearInput";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    updated?: string;
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

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/credit-cards"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to credit cards
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Edit credit card</h1>

          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
            </div>
          )}
          {resolvedSearchParams?.updated && (
            <div className="rounded-lg border border-emerald-600 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
              Credit card updated.
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
            <input
              id="card_name"
              name="card_name"
              required
              defaultValue={card.card_name}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
            <input
              id="issuer_name"
              name="issuer_name"
              required
              defaultValue={card.issuer_name}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="co_brand" className="mb-1 block text-xs font-medium text-slate-400">
              Co-brand (optional)
            </label>
            <input
              id="co_brand"
              name="co_brand"
              defaultValue={card.co_brand ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="product_name" className="mb-1 block text-xs font-medium text-slate-400">
              Product name (optional)
            </label>
            <input
              id="product_name"
              name="product_name"
              defaultValue={card.product_name ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="card_last_four" className="mb-1 block text-xs font-medium text-slate-400">
              Last 4 digits
            </label>
            <input
              id="card_last_four"
              name="card_last_four"
              required
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              defaultValue={card.card_last_four}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="digital_wallet_identifier"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Digital Wallet identifier (optional)
            </label>
            <input
              id="digital_wallet_identifier"
              name="digital_wallet_identifier"
              defaultValue={card.digital_wallet_identifier ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="e.g. 2"
            />
          </div>
          <div>
            <label htmlFor="monthly_cost" className="mb-1 block text-xs font-medium text-slate-400">
              Monthly cost
            </label>
            <input
              id="monthly_cost"
              name="monthly_cost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={card.monthly_cost == null ? "" : Number(card.monthly_cost)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
              defaultValue={card.family_member_id}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">None</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name} ({a.bank_name})
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label htmlFor="cancelled_at" className="mb-1 block text-xs font-medium text-slate-400">
              Cancellation date
            </label>
            <input
              id="cancelled_at"
              name="cancelled_at"
              type="date"
              defaultValue={card.cancelled_at ? card.cancelled_at.toISOString().slice(0, 10) : ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="website_url" className="mb-1 block text-xs font-medium text-slate-400">
              Website / URL
            </label>
            <input
              id="website_url"
              name="website_url"
              defaultValue={card.website_url ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="Optional"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={card.notes ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="Required when status is Cancelled"
            />
          </div>

          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
