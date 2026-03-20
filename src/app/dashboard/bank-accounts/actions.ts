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
  const branch_name = (formData.get("branch_name") as string | null)?.trim() || null;
  const account_number = (formData.get("account_number") as string | null)?.trim() || null;
  const sort_code_raw = (formData.get("sort_code") as string | null)?.trim() || null;
  const sort_code = sort_code_raw ? sort_code_raw.replace(/\D/g, "") : null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const country = (formData.get("country") as string | null)?.trim() || "IL";

  if (!account_name || !bank_name) {
    redirect("/dashboard/bank-accounts?error=Account+name+and+bank+required");
  }

  if (sort_code && !/^\d{6}$/.test(sort_code)) {
    redirect("/dashboard/bank-accounts?error=Sort+code+must+be+exactly+6+digits");
  }

  await prisma.bank_accounts.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      account_name,
      bank_name,
      branch_number,
      branch_name,
      account_number,
      sort_code,
      notes,
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

export async function updateBankAccount(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/bank-accounts?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/bank-accounts?error=Missing+id");

  const account_name = (formData.get("account_name") as string | null)?.trim();
  const bank_name = (formData.get("bank_name") as string | null)?.trim();
  const branch_number = (formData.get("branch_number") as string | null)?.trim() || null;
  const branch_name = (formData.get("branch_name") as string | null)?.trim() || null;
  const account_number = (formData.get("account_number") as string | null)?.trim() || null;
  const sort_code_raw = (formData.get("sort_code") as string | null)?.trim() || null;
  const sort_code = sort_code_raw ? sort_code_raw.replace(/\D/g, "") : null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const country = (formData.get("country") as string | null)?.trim() || "IL";

  const isActiveRaw = (formData.get("is_active") as string | null)?.trim();
  const isActive =
    isActiveRaw === "false" ? false : true; // default to active for backwards-compat

  const dateClosedRaw = (formData.get("date_closed") as string | null)?.trim() || null;
  const dateClosed = dateClosedRaw ? new Date(dateClosedRaw) : null;

  if (!account_name || !bank_name) {
    redirect(`/dashboard/bank-accounts/${encodeURIComponent(id)}?error=Account+name+and+bank+required`);
  }

  if (sort_code && !/^\d{6}$/.test(sort_code)) {
    redirect(`/dashboard/bank-accounts/${encodeURIComponent(id)}?error=Sort+code+must+be+exactly+6+digits`);
  }

  if (!isActive) {
    if (!dateClosedRaw) {
      redirect(`/dashboard/bank-accounts/${encodeURIComponent(id)}?error=Date+closed+is+required+when+deactivated`);
    }
    if (!dateClosed || Number.isNaN(dateClosed.getTime())) {
      redirect(`/dashboard/bank-accounts/${encodeURIComponent(id)}?error=Invalid+date+closed`);
    }
  }

  await prisma.bank_accounts.updateMany({
    where: { id, household_id: householdId },
    data: {
      account_name,
      bank_name,
      branch_number,
      branch_name,
      account_number,
      sort_code,
      notes,
      currency,
      country,
      is_active: isActive,
      date_closed: isActive ? null : dateClosed,
    },
  });

  revalidatePath(`/dashboard/bank-accounts`);
  redirect(`/dashboard/bank-accounts?updated=1`);
}
