"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseDateInput(raw: string | null | undefined): Date | null {
  const v = raw?.trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseOptionalMoney(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

export async function createSavingsPolicy(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/savings-policies?error=No+household");
  }

  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  const policy_name = (formData.get("policy_name") as string | null)?.trim();
  const policy_number_raw = (formData.get("policy_number") as string | null)?.trim();
  const policy_number = policy_number_raw || null;
  const notes_raw = (formData.get("notes") as string | null)?.trim();
  const notes = notes_raw || null;

  const owner_family_member_id_raw =
    (formData.get("owner_family_member_id") as string | null)?.trim() || null;
  const bank_account_id_raw = (formData.get("bank_account_id") as string | null)?.trim() || null;
  const digital_payment_method_id_raw =
    (formData.get("digital_payment_method_id") as string | null)?.trim() || null;

  const start_date = parseDateInput(formData.get("start_date") as string | null);
  const maturity_date = parseDateInput(formData.get("maturity_date") as string | null);
  const renewal_date = parseDateInput(formData.get("renewal_date") as string | null);

  const current_balance = parseOptionalMoney(formData.get("current_balance") as string | null);
  const target_amount = parseOptionalMoney(formData.get("target_amount") as string | null);
  const monthly_contribution = parseOptionalMoney(formData.get("monthly_contribution") as string | null);

  const currency = ((formData.get("currency") as string | null)?.trim() || "ILS").toUpperCase();

  if (!provider_name || !policy_name) {
    redirect("/dashboard/savings-policies?error=Provider+and+plan+name+are+required");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    redirect("/dashboard/savings-policies?error=Use+a+3-letter+currency+code");
  }

  let owner_family_member_id: string | null = null;
  if (owner_family_member_id_raw) {
    const m = await prisma.family_members.findFirst({
      where: { id: owner_family_member_id_raw, household_id: householdId, is_active: true },
    });
    if (!m) redirect("/dashboard/savings-policies?error=Invalid+family+member");
    owner_family_member_id = owner_family_member_id_raw;
  }

  let bank_account_id: string | null = null;
  if (bank_account_id_raw) {
    const b = await prisma.bank_accounts.findFirst({
      where: { id: bank_account_id_raw, household_id: householdId, is_active: true },
    });
    if (!b) redirect("/dashboard/savings-policies?error=Invalid+bank+account");
    bank_account_id = bank_account_id_raw;
  }

  let digital_payment_method_id: string | null = null;
  if (digital_payment_method_id_raw) {
    const d = await prisma.digital_payment_methods.findFirst({
      where: { id: digital_payment_method_id_raw, household_id: householdId, is_active: true },
    });
    if (!d) redirect("/dashboard/savings-policies?error=Invalid+digital+payment+method");
    digital_payment_method_id = digital_payment_method_id_raw;
  }

  await prisma.savings_policies.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      provider_name,
      policy_name,
      policy_number,
      owner_family_member_id,
      current_balance,
      target_amount,
      monthly_contribution,
      currency,
      start_date,
      maturity_date,
      renewal_date,
      bank_account_id,
      digital_payment_method_id,
      notes,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/savings-policies");
  revalidatePath("/dashboard/upcoming-renewals");
  revalidatePath("/dashboard/reports");
  redirect("/dashboard/savings-policies?created=1");
}

export async function toggleSavingsPolicyActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/savings-policies?error=No+household");
  }

  await prisma.savings_policies.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/savings-policies");
  revalidatePath("/dashboard/upcoming-renewals");
  revalidatePath("/dashboard/reports");
  redirect("/dashboard/savings-policies?updated=1");
}
