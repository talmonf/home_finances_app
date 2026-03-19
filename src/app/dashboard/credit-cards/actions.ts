"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCreditCard(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/credit-cards?error=No+household");
  }

  const card_name = (formData.get("card_name") as string | null)?.trim();
  const issuer_name = (formData.get("issuer_name") as string | null)?.trim();
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim();
  const settlement_bank_account_id = (formData.get("settlement_bank_account_id") as string | null)?.trim();
  const card_last_four = (formData.get("card_last_four") as string | null)?.trim() || null;
  const expiry_date_raw = (formData.get("expiry_date") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";

  if (!card_name || !issuer_name || !family_member_id || !settlement_bank_account_id) {
    redirect("/dashboard/credit-cards?error=Card+name,+issuer,+member+and+settlement+account+required");
  }

  const expiry_date = expiry_date_raw ? new Date(expiry_date_raw) : null;
  if (expiry_date_raw && Number.isNaN(expiry_date?.getTime())) {
    redirect("/dashboard/credit-cards?error=Invalid+expiry+date");
  }

  const [member, bankAccount] = await Promise.all([
    prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
    }),
    prisma.bank_accounts.findFirst({
      where: { id: settlement_bank_account_id, household_id: householdId },
    }),
  ]);
  if (!member) {
    redirect("/dashboard/credit-cards?error=Invalid+family+member");
  }
  if (!bankAccount) {
    redirect("/dashboard/credit-cards?error=Invalid+settlement+account");
  }

  await prisma.credit_cards.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      family_member_id,
      card_name,
      issuer_name,
      card_last_four,
      expiry_date,
      settlement_bank_account_id,
      currency,
    },
  });

  revalidatePath("/dashboard/credit-cards");
  redirect("/dashboard/credit-cards?created=1");
}

export async function toggleCreditCardActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/credit-cards?error=No+household");
  }

  await prisma.credit_cards.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/credit-cards");
  redirect("/dashboard/credit-cards?updated=1");
}
