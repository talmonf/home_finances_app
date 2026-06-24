import { prisma } from "@/lib/auth";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import { sortAmountTotalsByCurrency, type AmountTotalsByCurrency } from "@/lib/private-clinic/list-amount-totals";

function whereForExpensesList(params: { householdId: string; familyMemberId?: string | null }) {
  const { householdId, familyMemberId } = params;
  return {
    household_id: householdId,
    job: jobWherePrivateClinicScoped(familyMemberId),
  };
}

export async function loadExpensesAmountTotal(params: {
  householdId: string;
  familyMemberId?: string | null;
}): Promise<AmountTotalsByCurrency> {
  const groups = await prisma.therapy_job_expenses.groupBy({
    by: ["currency"],
    where: whereForExpensesList(params),
    _sum: { amount: true },
  });
  const totals = new Map<string, number>();
  for (const group of groups) {
    const sum = group._sum?.amount;
    if (sum == null) continue;
    totals.set(group.currency, Number(sum.toString()));
  }
  return sortAmountTotalsByCurrency(totals);
}

export async function loadExpensesRecordCount(params: {
  householdId: string;
  familyMemberId?: string | null;
}): Promise<number> {
  return prisma.therapy_job_expenses.count({ where: whereForExpensesList(params) });
}
