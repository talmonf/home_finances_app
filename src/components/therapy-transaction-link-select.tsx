import { getCurrentHouseholdDateDisplayFormat, prisma } from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";

export async function TherapyTransactionLinkSelect({
  name,
  householdId,
  currentId,
  label,
  hint,
  noneOptionLabel,
}: {
  name: string;
  householdId: string;
  currentId?: string | null;
  /** Short label, e.g. "Clinic income" or "Expense payment" */
  label?: string;
  /** Extra line of help under the label */
  hint?: string;
  /** Override first `<option>` text (e.g. Hebrew) */
  noneOptionLabel?: string;
}) {
  const dateFmt = await getCurrentHouseholdDateDisplayFormat();
  const txs = await prisma.transactions.findMany({
    where: { household_id: householdId },
    orderBy: { transaction_date: "desc" },
    take: 200,
    select: {
      id: true,
      transaction_date: true,
      amount: true,
      description: true,
      transaction_direction: true,
    },
  });

  return (
    <div className="space-y-1">
      {label ? (
        <span className="block text-xs font-medium text-slate-400">{label}</span>
      ) : null}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      <select
        name={name}
        defaultValue={currentId ?? ""}
        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
      <option value="">{noneOptionLabel ?? "None (not linked)"}</option>
      {txs.map((t) => {
        const amt = t.amount.toString();
        const dir = t.transaction_direction === "credit" ? "+" : "−";
        const label = `${formatHouseholdDate(t.transaction_date, dateFmt)} ${dir}${amt} ${t.description ?? ""}`.slice(
          0,
          120,
        );
        return (
          <option key={t.id} value={t.id}>
            {label}
          </option>
        );
      })}
    </select>
    </div>
  );
}
