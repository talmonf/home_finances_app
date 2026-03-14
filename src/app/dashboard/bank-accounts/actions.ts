"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createBankAccount(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/bank-accounts?error=No+household");
  }

  const account_name = (formData.get("account_name") as string | null)?.trim();
  const bank_name = (formData.get("bank_name") as string | null)?.trim();
  const branch_number = (formData.get("branch_number") as string | null)?.trim() || null;
  const account_number = (formData.get("account_number") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const country = (formData.get("country") as string | null)?.trim() || "IL";

  if (!account_name || !bank_name) {
    redirect("/dashboard/bank-accounts?error=Account+name+and+bank+required");
  }

  await prisma.bank_accounts.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      account_name,
      bank_name,
      branch_number,
      account_number,
      currency,
      country,
    },
  });

  revalidatePath("/dashboard/bank-accounts");
  redirect("/dashboard/bank-accounts?created=1");
}

export async function toggleBankAccountActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/bank-accounts?error=No+household");
  }

  await prisma.bank_accounts.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/bank-accounts");
  redirect("/dashboard/bank-accounts?updated=1");
}
