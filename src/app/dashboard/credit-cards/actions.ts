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
  const scheme = (formData.get("scheme") as string | null)?.trim();
  const issuer_name = (formData.get("issuer_name") as string | null)?.trim();
  const co_brand = (formData.get("co_brand") as string | null)?.trim() || null;
  const product_name = (formData.get("product_name") as string | null)?.trim() || null;
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim();
  const settlement_bank_account_id = (formData.get("settlement_bank_account_id") as string | null)?.trim();
  const card_last_four = (formData.get("card_last_four") as string | null)?.trim();
  const monthly_cost_raw = (formData.get("monthly_cost") as string | null)?.trim();
  const expiry_date_raw = (formData.get("expiry_date") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";

  if (
    !card_name ||
    !scheme ||
    !issuer_name ||
    !family_member_id ||
    !settlement_bank_account_id ||
    !card_last_four ||
    !monthly_cost_raw
  ) {
    redirect(
      "/dashboard/credit-cards?error=Card,+scheme,+issuer,+last+4,+monthly+cost,+member+and+settlement+account+required",
    );
  }

  if (!["visa", "mastercard", "amex", "other"].includes(scheme)) {
    redirect("/dashboard/credit-cards?error=Invalid+scheme");
  }

  if (!/^\d{4}$/.test(card_last_four)) {
    redirect("/dashboard/credit-cards?error=Last+4+digits+must+be+exactly+4+numbers");
  }

  const monthly_cost = Number.parseFloat(monthly_cost_raw);
  if (Number.isNaN(monthly_cost) || monthly_cost < 0) {
    redirect("/dashboard/credit-cards?error=Invalid+monthly+cost");
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
      scheme: scheme as "visa" | "mastercard" | "amex" | "other",
      issuer_name,
      co_brand,
      product_name,
      card_last_four,
      monthly_cost,
      expiry_date,
      notes,
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

export async function updateCreditCardStatus(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/credit-cards?error=No+household");
  }

  const id = (formData.get("id") as string | null)?.trim();
  const nextStatus = (formData.get("status") as string | null)?.trim();
  const cancelled_at_raw = (formData.get("cancelled_at") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!id || (nextStatus !== "active" && nextStatus !== "cancelled")) {
    redirect("/dashboard/credit-cards?error=Invalid+status+update+request");
  }

  if (nextStatus === "cancelled") {
    const cancelled_at = cancelled_at_raw ? new Date(cancelled_at_raw) : new Date();
    if (Number.isNaN(cancelled_at.getTime())) {
      redirect("/dashboard/credit-cards?error=Invalid+cancelled+date");
    }

    await prisma.credit_cards.updateMany({
      where: { id, household_id: householdId },
      data: {
        cancelled_at,
        notes,
        is_active: false,
      },
    });
  } else {
    await prisma.credit_cards.updateMany({
      where: { id, household_id: householdId },
      data: {
        cancelled_at: null,
        is_active: true,
      },
    });
  }

  revalidatePath("/dashboard/credit-cards");
  redirect("/dashboard/credit-cards?updated=1");
}
