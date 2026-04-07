import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSignificantPurchase, toggleSignificantPurchaseActive } from "./actions";

export const dynamic = "force-dynamic";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const PURCHASE_CATEGORY_LABELS: Record<string, string> = {
  electronics: "Electronics",
  appliances: "Appliances",
  tools: "Tools",
  other: "Other",
};

const PURCHASE_SOURCE_TYPE_LABELS: Record<string, string> = {
  credit_card: "Credit card",
  present: "Present",
  other: "Other",
};

function formatScheme(scheme: string) {
  if (scheme === "amex") return "Amex";
  if (scheme === "diners_club") return "Diners Club";
  if (scheme === "isracard") return "Isracard";
  if (scheme === "mastercard") return "Mastercard";
  if (scheme === "visa") return "Visa";
  return "Other";
}

function buildCreditCardLabel(card: {
  card_name: string;
  scheme: string;
  issuer_name: string;
  co_brand: string | null;
  product_name: string | null;
  card_last_four: string;
  family_member: { full_name: string };
}) {
  const coBrandPart = card.co_brand ? ` / ${card.co_brand}` : "";
  const productPart = card.product_name ? ` / ${card.product_name}` : "";
  return `${card.card_name} (${formatScheme(card.scheme)}) - ${card.issuer_name}${coBrandPart}${productPart} - ****${card.card_last_four} (${card.family_member.full_name})`;
}

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

export default async function SignificantPurchasesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const today = startOfToday();

  const [purchases, familyMembers, creditCards] = await Promise.all([
    prisma.significant_purchases.findMany({
      where: { household_id: householdId },
      include: { family_member: true, credit_card: { include: { family_member: true } } },
      orderBy: { warranty_expiry_date: "asc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.credit_cards.findMany({
      where: {
        household_id: householdId,
        cancelled_at: null,
        OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
      },
      include: { family_member: true },
      orderBy: { card_name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
                {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
              </Link>
              <h1 className="text-2xl font-semibold text-slate-50">Significant purchases</h1>
              <p className="text-sm text-slate-400">
                Track major purchases (e.g. electronics/tools) and optional warranty expiry.
              </p>
            </div>
          </div>

          {(resolvedSearchParams?.created || resolvedSearchParams?.updated || resolvedSearchParams?.error) && (
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
                  : resolvedSearchParams?.created
                    ? "Purchase added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "הוספה חדשה" : "Add new"}</h2>
          <form
            action={createSignificantPurchase}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <label htmlFor="item_name" className="mb-1 block text-xs font-medium text-slate-400">
                Item name
              </label>
              <input
                id="item_name"
                name="item_name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Laptop, Washing machine, Power drill"
              />
            </div>

            <div>
              <label htmlFor="purchase_date" className="mb-1 block text-xs font-medium text-slate-400">
                Purchase date
              </label>
              <input
                id="purchase_date"
                name="purchase_date"
                type="date"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="warranty_expiry_date" className="mb-1 block text-xs font-medium text-slate-400">
                Warranty expiry date (optional)
              </label>
              <input
                id="warranty_expiry_date"
                name="warranty_expiry_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="purchase_category" className="mb-1 block text-xs font-medium text-slate-400">
                Purchase category
              </label>
              <select
                id="purchase_category"
                name="purchase_category"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue="electronics"
              >
                <option value="electronics">Electronics</option>
                <option value="appliances">Appliances</option>
                <option value="tools">Tools</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="purchase_source_type" className="mb-1 block text-xs font-medium text-slate-400">
                Source
              </label>
              <select
                id="purchase_source_type"
                name="purchase_source_type"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue="credit_card"
              >
                <option value="credit_card">Credit card</option>
                <option value="present">Present</option>
                <option value="other">Other</option>
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
                defaultValue=""
              >
                <option value="">— Household —</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="credit_card_id" className="mb-1 block text-xs font-medium text-slate-400">
                Credit card (required when source is Credit card)
              </label>
              <select
                id="credit_card_id"
                name="credit_card_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="">— None —</option>
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {buildCreditCardLabel(c)}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                Notes (optional)
              </label>
              <input
                id="notes"
                name="notes"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional warranty notes / receipts / service center"
              />
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                {isHebrew ? "הוספת רכישה משמעותית" : "Add significant purchase"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "רשימה" : "List"}</h2>
          {purchases.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No significant purchases yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Item</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Purchase date</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Warranty expiry</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Category / Source</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{p.item_name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatHouseholdDate(p.purchase_date, dateDisplayFormat)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatHouseholdDate(p.warranty_expiry_date, dateDisplayFormat)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {PURCHASE_CATEGORY_LABELS[p.purchase_category] ?? p.purchase_category} /{" "}
                        {PURCHASE_SOURCE_TYPE_LABELS[p.purchase_source_type] ?? p.purchase_source_type}
                      </td>
                      <td className="px-4 py-3">
                        <span className={p.is_active ? "text-emerald-400" : "text-slate-500"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form
                          action={toggleSignificantPurchaseActive.bind(null, p.id, !p.is_active)}
                          className="inline"
                        >
                          <button type="submit" className="text-xs font-medium text-sky-400 hover:text-sky-300">
                            {p.is_active ? (isHebrew ? "השבתה" : "Deactivate") : isHebrew ? "הפעלה" : "Activate"}
                          </button>
                        </form>
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

