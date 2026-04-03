import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateDigitalPaymentMethod } from "../actions";

export const dynamic = "force-dynamic";

const METHOD_TYPE_LABELS: Record<string, string> = {
  bit: "Bit",
  paybox: "PayBox",
  paypal: "PayPal",
  other: "Other",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function DigitalPaymentMethodDetailPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [method, bankAccounts, familyMembers, creditCards] = await Promise.all([
    prisma.digital_payment_methods.findFirst({
      where: { id, household_id: householdId },
      include: {
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

  if (!method) redirect("/dashboard/digital-payment-methods?error=Not+found");

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/digital-payment-methods"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to digital payment methods
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Edit digital payment method</h1>

          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
            </div>
          )}
        </header>

        <section className="space-y-4">
          <form
            action={updateDigitalPaymentMethod}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={method.id} />

            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-slate-400">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                defaultValue={method.name}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
                defaultValue={method.method_type}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                {(["bit", "paybox", "paypal", "other"] as const).map((v) => (
                  <option key={v} value={v}>
                    {METHOD_TYPE_LABELS[v]}
                  </option>
                ))}
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
                defaultValue={method.linked_bank_account_id ?? ""}
              >
                <option value="">None</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.account_name} ({b.bank_name})
                    {!b.is_active ? " — inactive" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
                Family member (optional)
              </label>
              <select
                id="family_member_id"
                name="family_member_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue={method.family_member_id ?? ""}
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
                defaultValue={method.primary_credit_card_id ?? ""}
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
                defaultValue={method.secondary_credit_card_id ?? ""}
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
                defaultValue={
                  method.date_created
                    ? method.date_created.toISOString().slice(0, 10)
                    : ""
                }
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
                defaultValue={method.website_url ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={method.notes ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Save changes
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
