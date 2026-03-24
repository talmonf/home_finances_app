import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createCreditCard } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

function formatExpiryMonthYear(d: Date | null) {
  if (!d) return "—";
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const year = `${d.getFullYear()}`.slice(-2);
  return `${month}/${year}`;
}

function formatScheme(scheme: string) {
  if (scheme === "amex") return "Amex";
  if (scheme === "mastercard") return "Mastercard";
  if (scheme === "visa") return "Visa";
  return "Other";
}

function getCreditCardStatus(card: { cancelled_at: Date | null; expiry_date: Date | null }) {
  if (card.cancelled_at) return "Cancelled";
  if (card.expiry_date && card.expiry_date < new Date()) return "Expired";
  return "Active";
}

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

export default async function CreditCardsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [cards, familyMembers, bankAccounts] = await Promise.all([
    prisma.credit_cards.findMany({
      where: { household_id: householdId },
      include: { family_member: true, bank_account: true },
      orderBy: { card_name: "asc" },
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
                ← Back to dashboard
              </Link>
              <h1 className="text-2xl font-semibold text-slate-50">
                Credit cards
              </h1>
              <p className="text-sm text-slate-400">
                Manage credit cards and link them to a family member and settlement bank account.
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
                  ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                  : resolvedSearchParams.created
                    ? "Credit card added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new</h2>
          <form
            action={createCreditCard}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <label htmlFor="card_name" className="mb-1 block text-xs font-medium text-slate-400">
                Card
              </label>
              <input
                id="card_name"
                name="card_name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Bank Mizrachi Visa / SuperPharm card"
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
                defaultValue="visa"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">Amex</option>
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
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Bank Mizrachi / Chase / Citi / Amex"
              />
            </div>
            <div>
              <label htmlFor="co_brand" className="mb-1 block text-xs font-medium text-slate-400">
                Co-brand (optional)
              </label>
              <input
                id="co_brand"
                name="co_brand"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. SuperPharm / Amazon / Delta"
              />
            </div>
            <div>
              <label htmlFor="product_name" className="mb-1 block text-xs font-medium text-slate-400">
                Product name (optional)
              </label>
              <input
                id="product_name"
                name="product_name"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Lifestyle / Sapphire Preferred"
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
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="1234"
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
                defaultValue="ILS"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="expiry_month_year" className="mb-1 block text-xs font-medium text-slate-400">
                Expiry (MM/YY, optional)
              </label>
              <input
                id="expiry_month_year"
                name="expiry_month_year"
                inputMode="numeric"
                pattern="(0[1-9]|1[0-2])\/\d{2}"
                placeholder="MM/YY"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                Notes (optional)
              </label>
              <input
                id="notes"
                name="notes"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Any notes about this card"
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
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Select…</option>
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
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Select…</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_name} ({a.bank_name})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Add credit card
              </button>
            </div>
          </form>
          {familyMembers.length === 0 && (
            <p className="text-xs text-amber-400">
              Add at least one family member and one bank account first.
            </p>
          )}
          {familyMembers.length > 0 && bankAccounts.length === 0 && (
            <p className="text-xs text-amber-400">
              Add at least one bank account to link as settlement account.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">List</h2>
          {cards.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No credit cards yet. Add family members and bank accounts first, then add a card above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Card</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Scheme</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Issuer</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Co-brand</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Product name</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Last 4</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Monthly cost</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Expiry</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Family member</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Settlement account</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c) => (
                    <tr key={c.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{c.card_name}</td>
                      <td className="px-4 py-3 text-slate-300">{formatScheme(c.scheme)}</td>
                      <td className="px-4 py-3 text-slate-300">{c.issuer_name}</td>
                      <td className="px-4 py-3 text-slate-400">{c.co_brand ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{c.product_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{c.card_last_four}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.monthly_cost == null
                          ? "—"
                          : Number(c.monthly_cost).toLocaleString("en", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatExpiryMonthYear(c.expiry_date)}</td>
                      <td className="px-4 py-3 text-slate-400">{c.family_member.full_name}</td>
                      <td className="px-4 py-3 text-slate-400">{c.bank_account.account_name}</td>
                      <td className="px-4 py-3">
                        {(() => {
                          const status = getCreditCardStatus(c);
                          const colorClass =
                            status === "Active"
                              ? "text-emerald-400"
                              : status === "Expired"
                                ? "text-amber-400"
                                : "text-rose-300";
                          return (
                            <div className="space-y-1">
                              <p className={colorClass}>{status}</p>
                              {c.cancelled_at && (
                                <p className="text-xs text-slate-500">
                                  On {formatDate(c.cancelled_at)}
                                </p>
                              )}
                              {c.notes && <p className="text-xs text-slate-500">{c.notes}</p>}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/credit-cards/${c.id}`} className="text-xs font-medium text-sky-400 hover:text-sky-300">
                          Edit
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
