import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { formatRentalTypeLabel } from "@/lib/rental-labels";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  updateTransactionRow,
  confirmAllTransactionsForDocument,
  createCategory,
  createPayee,
} from "../../actions";
import { ImportReviewSubscriptionJobFields } from "@/components/import-review-subscription-job-fields";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ documentId: string }>;
  searchParams?: Promise<{ confirmed?: string; error?: string }>;
};

function formatMoney(value: unknown) {
  if (value == null) return "—";
  const n =
    typeof value === "object" && value !== null && "toNumber" in value
      ? (value as { toNumber(): number }).toNumber()
      : Number(value);
  return Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PURCHASE_CATEGORY_LABELS: Record<string, string> = {
  electronics: "Electronics",
  appliances: "Appliances",
  tools: "Tools",
  other: "Other",
};

export default async function ImportReviewPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const { documentId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [doc, transactions, categories, payees, familyMembers, studies, significantPurchases, rentals, trips, cars, subscriptions] =
    await Promise.all([
    prisma.documents.findFirst({
      where: { id: documentId, household_id: householdId },
      include: { bank_account: true },
    }),
    prisma.transactions.findMany({
      where: { document_id: documentId, household_id: householdId },
      include: {
        category: true,
        payee: true,
        family_member: true,
        study_or_class: true,
        rental: true,
        trip: true,
        car: true,
        job: true,
        subscription: true,
      },
      orderBy: { transaction_date: "asc" },
    }),
    prisma.categories.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { name: "asc" },
    }),
    prisma.payees.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.studies_and_classes.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { name: "asc" },
    }),
    prisma.significant_purchases.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { warranty_expiry_date: "asc" },
      select: { id: true, item_name: true, warranty_expiry_date: true, purchase_category: true },
    }),
    prisma.rentals.findMany({
      where: { household_id: householdId, is_active: true },
      include: { property: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.trips.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ start_date: "desc" }, { name: "asc" }],
    }),
    prisma.cars.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ maker: "asc" }, { model: "asc" }],
    }),
    prisma.subscriptions.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, job_id: true },
    }),
  ]);

  if (!doc) notFound();

  const txJobIds = [
    ...new Set(transactions.map((t) => t.job_id).filter((id): id is string => Boolean(id))),
  ];
  const subJobIds = [
    ...new Set(subscriptions.map((s) => s.job_id).filter((id): id is string => Boolean(id))),
  ];
  const extraJobIds = [...new Set([...txJobIds, ...subJobIds])];

  const jobs = await prisma.jobs.findMany({
    where: {
      household_id: householdId,
      OR: [{ is_active: true }, ...(extraJobIds.length > 0 ? [{ id: { in: extraJobIds } }] : [])],
    },
    orderBy: [{ job_title: "asc" }, { employer_name: "asc" }],
  });

  const jobOptions = jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }));
  const subscriptionOptions = subscriptions.map((s) => ({
    id: s.id,
    name: s.name,
    jobId: s.job_id,
  }));

  const significantPurchaseById = new Map(significantPurchases.map((sp) => [sp.id, sp]));

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header>
          <Link
            href="/dashboard/import"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה ליבוא →" : "← Back to import"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{isHebrew ? "סקירת תנועות" : "Review transactions"}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {doc.file_name}
            {doc.bank_account ? ` · ${doc.bank_account.account_name}` : ""}
          </p>
          {(resolvedSearchParams?.confirmed || resolvedSearchParams?.error) && (
            <div
              className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolvedSearchParams.error
                ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                : "All transactions marked as confirmed."}
            </div>
          )}
        </header>

        <div className="flex flex-wrap gap-4">
          <form action={confirmAllTransactionsForDocument.bind(null, documentId)} className="inline">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              {isHebrew ? "אישור הכל" : "Confirm all"}
            </button>
          </form>
        </div>

        {/* Quick add category / payee */}
        <div className="flex flex-wrap gap-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <form action={createCategory} className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">{isHebrew ? "קטגוריה חדשה" : "New category"}</label>
              <input
                name="name"
                placeholder="Category name"
                className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
              />
            </div>
            <button type="submit" className="rounded bg-slate-600 px-3 py-1.5 text-xs text-white hover:bg-slate-500">
              {isHebrew ? "הוספה" : "Add"}
            </button>
          </form>
          <form action={createPayee} className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">{isHebrew ? "מוטב חדש" : "New payee"}</label>
              <input
                name="name"
                placeholder="Payee name"
                className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
              />
            </div>
            <button type="submit" className="rounded bg-slate-600 px-3 py-1.5 text-xs text-white hover:bg-slate-500">
              {isHebrew ? "הוספה" : "Add"}
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-2 py-2 font-medium text-slate-300">{isHebrew ? "תאריך" : "Date"}</th>
                <th className="px-2 py-2 font-medium text-slate-300">{isHebrew ? "סכום" : "Amount"}</th>
                <th className="px-2 py-2 font-medium text-slate-300">Description</th>
                <th className="px-2 py-2 font-medium text-slate-300">
                  Category · Payee · Notes · Family · Course · Purchase · Rental · Trip · Car · Sub · Job
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-700/80 hover:bg-slate-800/30">
                  <td className="whitespace-nowrap px-2 py-2 text-slate-300">
                    {formatHouseholdDate(tx.transaction_date, dateDisplayFormat)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-300">
                    {formatMoney(tx.amount)} {tx.transaction_direction}
                  </td>
                  <td className="max-w-[180px] truncate px-2 py-2 text-slate-400" title={tx.description ?? ""}>
                    {tx.description ?? "—"}
                  </td>
                  <td colSpan={6} className="px-2 py-2">
                    <form action={updateTransactionRow} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="transaction_id" value={tx.id} />
                      <select
                        name="category_id"
                        defaultValue={tx.category_id ?? ""}
                        className="min-w-[100px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      >
                        <option value="">—</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        name="payee_id"
                        defaultValue={tx.payee_id ?? ""}
                        className="min-w-[100px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      >
                        <option value="">—</option>
                        {payees.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        name="notes"
                        defaultValue={tx.notes ?? ""}
                        placeholder="Notes"
                        className="min-w-[80px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      />
                      <select
                        name="family_member_id"
                        defaultValue={tx.family_member_id ?? ""}
                        className="min-w-[100px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      >
                        <option value="">—</option>
                        {familyMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name}
                          </option>
                        ))}
                      </select>
                      <select
                        name="study_or_class_id"
                        defaultValue={tx.study_or_class_id ?? ""}
                        className="min-w-[100px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      >
                        <option value="">—</option>
                        {studies.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>

                      {/*
                        Warranty-bearing purchases can be linked to this transaction.
                        Purchase category is used to update the linked purchase's category when set.
                      */}
                      <select
                        name="purchase_category"
                        defaultValue={
                          tx.significant_purchase_id
                            ? significantPurchaseById.get(tx.significant_purchase_id)?.purchase_category ?? ""
                            : ""
                        }
                        className="min-w-[120px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      >
                        <option value="">—</option>
                        {Object.entries(PURCHASE_CATEGORY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <select
                        name="significant_purchase_id"
                        defaultValue={tx.significant_purchase_id ?? ""}
                        className="min-w-[180px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      >
                        <option value="">— None —</option>
                        {significantPurchases.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.item_name}
                            {sp.warranty_expiry_date
                            ? ` (${formatHouseholdDate(sp.warranty_expiry_date, dateDisplayFormat)})`
                            : ""}
                          </option>
                        ))}
                      </select>
                      <select
                        name="rental_id"
                        defaultValue={tx.rental_id ?? ""}
                        className="min-w-[180px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      >
                        <option value="">— Rental —</option>
                        {rentals.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.property.name} · {formatRentalTypeLabel(r.rental_type)}
                          </option>
                        ))}
                      </select>
                      <select
                        name="trip_id"
                        defaultValue={tx.trip_id ?? ""}
                        className="min-w-[160px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      >
                        <option value="">— Trip —</option>
                        {trips.map((trip) => (
                          <option key={trip.id} value={trip.id}>
                            {trip.name}
                            {trip.city ? ` · ${trip.city}` : ""}
                          </option>
                        ))}
                      </select>
                      <select
                        name="car_id"
                        defaultValue={tx.car_id ?? ""}
                        className="min-w-[180px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
                      >
                        <option value="">— Car —</option>
                        {cars.map((car) => (
                          <option key={car.id} value={car.id}>
                            {car.maker} {car.model}
                            {car.plate_number ? ` · ${car.plate_number}` : ""}
                          </option>
                        ))}
                      </select>

                      <ImportReviewSubscriptionJobFields
                        subscriptions={subscriptionOptions}
                        jobs={jobOptions}
                        initialSubscriptionId={tx.subscription_id ?? ""}
                        initialJobId={tx.job_id ?? ""}
                        subscriptionPlaceholder={isHebrew ? "— מנוי —" : "— Subscription —"}
                        jobPlaceholder={isHebrew ? "— עבודה —" : "— Job —"}
                      />

                      <button
                        type="submit"
                        className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500"
                      >
                        {isHebrew ? "שמירת שורה" : "Save row"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
            No transactions in this import.
          </p>
        )}
      </div>
    </div>
  );
}
