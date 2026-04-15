import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatClientNameForDisplay, formatDecimalAmountForDisplay, OBFUSCATED } from "@/lib/privacy-display";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { notFound, redirect } from "next/navigation";
import {
  deleteReceiptAllocation,
  updateTherapyReceipt,
  upsertReceiptAllocation,
} from "../../actions";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";

export const dynamic = "force-dynamic";

export default async function ReceiptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ updated?: string }>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const isHebrew = uiLanguage === "he";
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;

  const receipt = await prisma.therapy_receipts.findFirst({
    where: { id, household_id: householdId },
    include: {
      job: true,
      allocations: { include: { treatment: { include: { client: true } } } },
    },
  });
  if (!receipt) notFound();

  const [jobs, treatments] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({
        householdId,
        includeJobIds: [receipt.job_id],
      }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId, job_id: receipt.job_id },
      orderBy: { occurred_at: "desc" },
      take: 200,
      include: { client: true },
    }),
  ]);

  const allocatedSum = receipt.allocations.reduce(
    (s, a) => s + Number(a.amount),
    0,
  );
  const totalNum = Number(receipt.total_amount);
  const match =
    obfuscate ? (
      <span className="text-slate-400">{OBFUSCATED}</span>
    ) : Math.abs(allocatedSum - totalNum) < 0.01 ? (
      <span className="text-emerald-400">{isHebrew ? "השיוכים תואמים לסכום הכולל" : "Allocations match total"}</span>
    ) : (
      <span className="text-amber-400">
        {isHebrew
          ? `שוייך ${allocatedSum.toFixed(2)} מתוך ${totalNum.toFixed(2)}`
          : `Allocated ${allocatedSum.toFixed(2)} vs total ${totalNum.toFixed(2)}`}
      </span>
    );

  return (
    <div className="space-y-8">
      <Link href="/dashboard/private-clinic/receipts" className="text-sm text-sky-400">
        {isHebrew ? "חזרה לקבלות →" : "← Receipts"}
      </Link>
      {sp?.updated && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {isHebrew ? "נשמר." : "Saved."}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">
          {isHebrew ? `קבלה ${receipt.receipt_number}` : `Receipt ${receipt.receipt_number}`}
        </h2>
        <p className="text-sm text-slate-400">{match}</p>
        <form
          action={updateTherapyReceipt}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={receipt.id} />
          <select
            name="job_id"
            required
            defaultValue={receipt.job_id}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {formatJobDisplayLabel(j)}
              </option>
            ))}
          </select>
          <input
            name="receipt_number"
            defaultValue={receipt.receipt_number}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="issued_at"
            type="date"
            defaultValue={receipt.issued_at.toISOString().slice(0, 10)}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="total_amount"
            defaultValue={receipt.total_amount.toString()}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="currency"
            defaultValue={receipt.currency}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="covered_period_start"
            type="date"
            defaultValue={receipt.covered_period_start ? receipt.covered_period_start.toISOString().slice(0, 10) : ""}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="covered_period_end"
            type="date"
            defaultValue={receipt.covered_period_end ? receipt.covered_period_end.toISOString().slice(0, 10) : ""}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <select
            name="recipient_type"
            defaultValue={receipt.recipient_type}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="client">{isHebrew ? "לקוח" : "Client"}</option>
            <option value="organization">{isHebrew ? "ארגון" : "Organization"}</option>
          </select>
          <select
            name="payment_method"
            defaultValue={receipt.payment_method}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="cash">{isHebrew ? "מזומן" : "Cash"}</option>
            <option value="bank_transfer">{isHebrew ? "העברה בנקאית" : "Bank transfer"}</option>
            <option value="digital_card">{isHebrew ? "כרטיס דיגיטלי" : "Digital card"}</option>
            <option value="credit_card">{isHebrew ? "כרטיס אשראי" : "Credit card"}</option>
          </select>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">
              {isHebrew ? "קישור תנועת בנק (אופציונלי)" : "Link bank transaction (optional)"}
            </label>
            <TherapyTransactionLinkSelect
              name="linked_transaction_id"
              householdId={householdId}
              currentId={receipt.linked_transaction_id}
              label={isHebrew ? "תשלום שהתקבל (בנק)" : "Payment received (bank)"}
              hint={
                isHebrew
                  ? "אופציונלי: קשרו לזיכוי שמתאים לקבלה זו."
                  : "Optional: link the credit that matches this receipt."
              }
            />
          </div>
          <textarea
            name="notes"
            defaultValue={receipt.notes ?? ""}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {isHebrew ? "שמירת קבלה" : "Save receipt"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-md font-medium text-slate-200">
          {isHebrew ? "שיוכים לטיפולים" : "Allocations to treatments"}
        </h3>
        <form
          action={upsertReceiptAllocation}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
        >
          <input type="hidden" name="receipt_id" value={receipt.id} />
          <select
            name="treatment_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{isHebrew ? "טיפול" : "Treatment"}</option>
            {treatments.map((t) => (
              <option key={t.id} value={t.id}>
                {formatHouseholdDate(t.occurred_at, dateDisplayFormat)} —{" "}
                {formatClientNameForDisplay(obfuscate, t.client.first_name, t.client.last_name)}{" "}
                {formatDecimalAmountForDisplay(obfuscate, t.amount, t.currency, uiLanguage)}
              </option>
            ))}
          </select>
          <input
            name="amount"
            placeholder={isHebrew ? "סכום" : "Amount"}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
          >
            {isHebrew ? "הוספה / עדכון" : "Add / update"}
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-3 py-2 text-slate-300">{isHebrew ? "טיפול" : "Treatment"}</th>
                <th className="px-3 py-2 text-slate-300">{isHebrew ? "סכום" : "Amount"}</th>
                <th className="px-3 py-2 text-slate-300">{isHebrew ? "הסרה" : "Remove"}</th>
              </tr>
            </thead>
            <tbody>
              {receipt.allocations.map((a) => (
                <tr key={a.id} className="border-b border-slate-700/80">
                  <td className="px-3 py-2 text-slate-300">
                    {formatHouseholdDate(a.treatment.occurred_at, dateDisplayFormat)} —{" "}
                    {formatClientNameForDisplay(
                      obfuscate,
                      a.treatment.client.first_name,
                      a.treatment.client.last_name,
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-100">
                    {obfuscate ? OBFUSCATED : a.amount.toString()}
                  </td>
                  <td className="px-3 py-2">
                    <ConfirmDeleteForm action={deleteReceiptAllocation}>
                      <input type="hidden" name="receipt_id" value={receipt.id} />
                      <input type="hidden" name="treatment_id" value={a.treatment_id} />
                      <button type="submit" className="text-xs text-rose-400">
                        {isHebrew ? "הסרה" : "Remove"}
                      </button>
                    </ConfirmDeleteForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
