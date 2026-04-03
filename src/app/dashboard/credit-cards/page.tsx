import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { SetupSectionMarkNotDoneBanner } from "@/app/dashboard/setup-section-mark-not-done-banner";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createCreditCard } from "./actions";
import ExpiryMonthYearInput from "./ExpiryMonthYearInput";

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
  if (scheme === "diners_club") return "Diners Club";
  if (scheme === "isracard") return "Isracard";
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
    sort?: string;
    dir?: string;
  }>;
};

export default async function CreditCardsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sort = resolvedSearchParams?.sort ?? "card";
  const dir = resolvedSearchParams?.dir === "desc" ? "desc" : "asc";

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

  const cardsSorted = [...cards].sort((a, b) => {
    const compare = (av: string | number | Date | null, bv: string | number | Date | null) => {
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av instanceof Date && bv instanceof Date) return av.getTime() - bv.getTime();
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
    };

    const statusRank = (card: { cancelled_at: Date | null; expiry_date: Date | null }) => {
      const status = getCreditCardStatus(card);
      return status === "Active" ? 0 : status === "Expired" ? 1 : 2;
    };

    const result =
      sort === "scheme"
        ? compare(a.scheme, b.scheme)
        : sort === "issuer"
          ? compare(a.issuer_name, b.issuer_name)
          : sort === "co_brand"
            ? compare(a.co_brand, b.co_brand)
            : sort === "product"
              ? compare(a.product_name, b.product_name)
              : sort === "last4"
                ? compare(a.card_last_four, b.card_last_four)
                : sort === "charge_day"
                  ? compare(a.charge_day_of_month, b.charge_day_of_month)
                  : sort === "monthly_cost"
                    ? compare(
                        a.monthly_cost == null ? null : Number(a.monthly_cost),
                        b.monthly_cost == null ? null : Number(b.monthly_cost),
                      )
                    : sort === "website"
                      ? compare(a.website_url, b.website_url)
                      : sort === "expiry"
                        ? compare(a.expiry_date, b.expiry_date)
                        : sort === "family_member"
                          ? compare(a.family_member.full_name, b.family_member.full_name)
                          : sort === "settlement_account"
                            ? compare(
                                a.bank_account?.account_name ?? null,
                                b.bank_account?.account_name ?? null,
                              )
                            : sort === "status"
                              ? compare(statusRank(a), statusRank(b))
                              : compare(a.card_name, b.card_name);

    return dir === "asc" ? result : -result;
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <SetupSectionMarkNotDoneBanner
            sectionId="creditCards"
            redirectPath="/dashboard/credit-cards"
          />
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
              <label
                htmlFor="digital_wallet_identifier"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Digital Wallet identifier (optional)
              </label>
              <input
                id="digital_wallet_identifier"
                name="digital_wallet_identifier"
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
                Expiry (MM/YY)
              </label>
              <ExpiryMonthYearInput
                id="expiry_month_year"
                name="expiry_month_year"
                required
                placeholder="MM/YY"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="website_url" className="mb-1 block text-xs font-medium text-slate-400">
                Website / URL
              </label>
              <input
                id="website_url"
                name="website_url"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
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
              Add at least one family member first.
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
                    {[
                      { key: "card", label: "Card" },
                      { key: "last4", label: "Last 4" },
                      { key: "expiry", label: "Expiry" },
                      { key: "family_member", label: "Family member" },
                      { key: "status", label: "Status" },
                      { key: "scheme", label: "Scheme" },
                      { key: "issuer", label: "Issuer" },
                      { key: "co_brand", label: "Co-brand" },
                      { key: "product", label: "Product name" },
                      { key: "charge_day", label: "Charge day" },
                      { key: "monthly_cost", label: "Monthly cost" },
                      { key: "website", label: "Website" },
                      { key: "settlement_account", label: "Settlement account" },
                    ].map((col) => {
                      const isActive = sort === col.key;
                      const nextDir = isActive && dir === "asc" ? "desc" : "asc";
                      const arrow = !isActive ? "" : dir === "asc" ? "↑" : "↓";
                      const query = new URLSearchParams();
                      if (resolvedSearchParams?.created) query.set("created", resolvedSearchParams.created);
                      if (resolvedSearchParams?.updated) query.set("updated", resolvedSearchParams.updated);
                      if (resolvedSearchParams?.error) query.set("error", resolvedSearchParams.error);
                      query.set("sort", col.key);
                      query.set("dir", nextDir);
                      return (
                        <th key={col.key} className="px-4 py-3 font-medium text-slate-300">
                          <Link
                            href={`/dashboard/credit-cards?${query.toString()}`}
                            className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-slate-300 hover:text-sky-300"
                          >
                            <span>{col.label}</span>
                            {arrow && <span>{arrow}</span>}
                          </Link>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {cardsSorted.map((c) => (
                    <tr key={c.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">
                        <Link
                          href={`/dashboard/credit-cards/${c.id}`}
                          className="text-sky-400 hover:text-sky-300"
                        >
                          {c.card_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{c.card_last_four}</td>
                      <td className="px-4 py-3 text-slate-400">{formatExpiryMonthYear(c.expiry_date)}</td>
                      <td className="px-4 py-3 text-slate-400">{c.family_member.full_name}</td>
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
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatScheme(c.scheme)}</td>
                      <td className="px-4 py-3 text-slate-300">{c.issuer_name}</td>
                      <td className="px-4 py-3 text-slate-400">{c.co_brand ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{c.product_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{c.charge_day_of_month ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.monthly_cost == null
                          ? "—"
                          : Number(c.monthly_cost).toLocaleString("en", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-slate-400" title={c.website_url ?? undefined}>
                        {c.website_url ? (
                          <a
                            href={c.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:text-sky-300"
                          >
                            {c.website_url}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{c.bank_account?.account_name ?? "—"}</td>
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
