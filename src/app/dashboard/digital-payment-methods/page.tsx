import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { SetupSectionMarkNotDoneBanner } from "@/app/dashboard/setup-section-mark-not-done-banner";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createDigitalPaymentMethod, toggleDigitalPaymentMethodActive } from "./actions";

export const dynamic = "force-dynamic";

const METHOD_TYPE_LABELS: Record<string, string> = {
  bit: "Bit",
  paybox: "PayBox",
  paypal: "PayPal",
  other: "Other",
};

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

export default async function DigitalPaymentMethodsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [methods, bankAccounts, familyMembers, creditCards] = await Promise.all([
    prisma.digital_payment_methods.findMany({
      where: { household_id: householdId },
      orderBy: [{ method_type: "asc" }, { name: "asc" }],
      include: {
        linked_bank_account: true,
        family_member: true,
        primary_credit_card: true,
        secondary_credit_card: true,
      },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId },
      orderBy: { account_name: "asc" },
      select: { id: true, account_name: true, bank_name: true, is_active: true },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.credit_cards.findMany({
      where: { household_id: householdId },
      orderBy: { card_name: "asc" },
      select: { id: true, card_name: true, card_last_four: true, cancelled_at: true, expiry_date: true },
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <SetupSectionMarkNotDoneBanner
            sectionId="digitalPaymentMethods"
            redirectPath="/dashboard/digital-payment-methods"
          />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/"
                className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
              >
                ← Back to dashboard
              </Link>
              <h1 className="text-2xl font-semibold text-slate-50">Digital payment methods</h1>
              <p className="text-sm text-slate-400">
                Track Bit, PayBox, PayPal, and other digital wallets or payment apps for this household.
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
                    ? "Digital payment method added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new</h2>
          <form
            action={createDigitalPaymentMethod}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2"
          >
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-slate-400">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Personal PayPal"
              />
            </div>
            <div>
              <label htmlFor="method_type" className="mb-1 block text-xs font-medium text-slate-400">
                Type
              </label>
              <select
                id="method_type"
                name="method_type"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue="paypal"
              >
                <option value="bit">Bit</option>
                <option value="paybox">PayBox</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="linked_bank_account_id" className="mb-1 block text-xs font-medium text-slate-400">
                Linked bank account (optional)
              </label>
              <select
                id="linked_bank_account_id"
                name="linked_bank_account_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="">None</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.account_name} ({b.bank_name})
                    {!b.is_active ? " — inactive" : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Optional account this wallet draws from or settles to (same household).
              </p>
            </div>
            <div>
              <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
                Family member (optional)
              </label>
              <select
                id="family_member_id"
                name="family_member_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="">None</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="primary_credit_card_id" className="mb-1 block text-xs font-medium text-slate-400">
                Primary credit card (optional)
              </label>
              <select
                id="primary_credit_card_id"
                name="primary_credit_card_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="">None</option>
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.card_name} · ****{c.card_last_four}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="secondary_credit_card_id" className="mb-1 block text-xs font-medium text-slate-400">
                Secondary credit card (optional)
              </label>
              <select
                id="secondary_credit_card_id"
                name="secondary_credit_card_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="">None</option>
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.card_name} · ****{c.card_last_four}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date_created" className="mb-1 block text-xs font-medium text-slate-400">
                Date created (optional)
              </label>
              <input
                id="date_created"
                name="date_created"
                type="date"
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
                placeholder="Optional (e.g. paypal.com)"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional (e.g. linked phone, email fragment)"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Add method
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">List</h2>
          {methods.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No digital payment methods yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Type</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Family member</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Primary card</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Secondary card</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Linked bank</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Website</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Notes</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Date created</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {methods.map((m) => (
                    <tr key={m.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{m.name}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {METHOD_TYPE_LABELS[m.method_type] ?? m.method_type}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {m.family_member ? m.family_member.full_name : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {m.primary_credit_card
                          ? `${m.primary_credit_card.card_name} · ****${m.primary_credit_card.card_last_four}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {m.secondary_credit_card
                          ? `${m.secondary_credit_card.card_name} · ****${m.secondary_credit_card.card_last_four}`
                          : "—"}
                      </td>
                      <td className="max-w-[10rem] truncate px-4 py-3 text-slate-400" title={m.linked_bank_account?.account_name}>
                        {m.linked_bank_account
                          ? `${m.linked_bank_account.account_name} (${m.linked_bank_account.bank_name})`
                          : "—"}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-slate-400" title={m.website_url ?? undefined}>
                        {m.website_url ? (
                          <a
                            href={m.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:text-sky-300"
                          >
                            {m.website_url}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-slate-400" title={m.notes ?? undefined}>
                        {m.notes?.trim() ? m.notes : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatHouseholdDate(m.date_created ?? m.created_at, dateDisplayFormat)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{m.is_active ? "Active" : "Inactive"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/digital-payment-methods/${m.id}`}
                            className="text-xs font-medium text-sky-400 hover:text-sky-300"
                          >
                            Edit
                          </Link>
                          <form action={toggleDigitalPaymentMethodActive.bind(null, m.id, !m.is_active)}>
                            <button
                              type="submit"
                              className="text-xs font-medium text-slate-400 hover:text-slate-200"
                            >
                              {m.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                        </div>
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
