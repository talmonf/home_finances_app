"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseExpiryMonthYear(raw: string | null): Date | null {
  if (!raw) return null;
  const match = raw.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!match) return null;
  const month = Number.parseInt(match[1], 10);
  const year = 2000 + Number.parseInt(match[2], 10);
  // Card expiry is month-based; store last day of the month.
  return new Date(year, month, 0);
}

function normalizeWebsiteUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid protocol");
  }
  return parsed.toString();
}

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
  const digital_wallet_identifier =
    (formData.get("digital_wallet_identifier") as string | null)?.trim() || null;
  const charge_day_of_month_raw =
    (formData.get("charge_day_of_month") as string | null)?.trim() || null;
  const monthly_cost_raw = (formData.get("monthly_cost") as string | null)?.trim() || null;
  const expiry_month_year_raw = (formData.get("expiry_month_year") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const website_url_raw = (formData.get("website_url") as string | null) || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";

  if (
    !card_name ||
    !scheme ||
    !issuer_name ||
    !family_member_id ||
    !settlement_bank_account_id ||
    !card_last_four
  ) {
    redirect(
      "/dashboard/credit-cards?error=Card,+scheme,+issuer,+last+4,+member+and+settlement+account+required",
    );
  }

  if (!["visa", "mastercard", "amex", "other"].includes(scheme)) {
    redirect("/dashboard/credit-cards?error=Invalid+scheme");
  }

  if (!/^\d{4}$/.test(card_last_four)) {
    redirect("/dashboard/credit-cards?error=Last+4+digits+must+be+exactly+4+numbers");
  }

  const monthly_cost = monthly_cost_raw === null ? null : Number.parseFloat(monthly_cost_raw);
  if (monthly_cost != null && (Number.isNaN(monthly_cost) || monthly_cost < 0)) {
    redirect("/dashboard/credit-cards?error=Invalid+monthly+cost");
  }
  const charge_day_of_month =
    charge_day_of_month_raw === null ? null : Number.parseInt(charge_day_of_month_raw, 10);
  if (
    charge_day_of_month != null &&
    (Number.isNaN(charge_day_of_month) || charge_day_of_month < 1 || charge_day_of_month > 31)
  ) {
    redirect("/dashboard/credit-cards?error=Charge+day+must+be+between+1+and+31");
  }

  if (!expiry_month_year_raw) {
    redirect("/dashboard/credit-cards?error=Expiry+date+is+required+(MM/YY)");
  }

  const expiry_date = parseExpiryMonthYear(expiry_month_year_raw);
  if (!expiry_date) {
    redirect("/dashboard/credit-cards?error=Invalid+expiry+date.+Use+MM/YY");
  }
  let website_url: string | null = null;
  try {
    website_url = normalizeWebsiteUrl(website_url_raw);
  } catch {
    redirect("/dashboard/credit-cards?error=Invalid+website+URL");
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

  try {
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
        digital_wallet_identifier,
        charge_day_of_month,
        monthly_cost,
        expiry_date,
        notes,
        website_url,
        settlement_bank_account_id,
        currency,
      },
    });
  } catch {
    if (monthly_cost === null) {
      redirect("/dashboard/credit-cards?error=Monthly+cost+blank+requires+latest+credit+card+migration");
    }
    throw new Error("Failed to create credit card");
  }

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
  const website_url_raw = (formData.get("website_url") as string | null) || null;

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

export async function updateCreditCard(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/credit-cards?error=No+household");
  }

  const id = (formData.get("id") as string | null)?.trim();
  const card_name = (formData.get("card_name") as string | null)?.trim();
  const scheme = (formData.get("scheme") as string | null)?.trim();
  const issuer_name = (formData.get("issuer_name") as string | null)?.trim();
  const co_brand = (formData.get("co_brand") as string | null)?.trim() || null;
  const product_name = (formData.get("product_name") as string | null)?.trim() || null;
  const card_last_four = (formData.get("card_last_four") as string | null)?.trim();
  const digital_wallet_identifier =
    (formData.get("digital_wallet_identifier") as string | null)?.trim() || null;
  const charge_day_of_month_raw =
    (formData.get("charge_day_of_month") as string | null)?.trim() || null;
  const monthly_cost_raw = (formData.get("monthly_cost") as string | null)?.trim() || null;
  const expiry_month_year_raw = (formData.get("expiry_month_year") as string | null)?.trim() || null;
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim();
  const settlement_bank_account_id = (formData.get("settlement_bank_account_id") as string | null)?.trim();
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const status = (formData.get("status") as string | null)?.trim();
  const cancelled_at_raw = (formData.get("cancelled_at") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (
    !id ||
    !card_name ||
    !scheme ||
    !issuer_name ||
    !card_last_four ||
    !family_member_id ||
    !settlement_bank_account_id
  ) {
    redirect("/dashboard/credit-cards?error=Missing+required+fields");
  }

  if (!["visa", "mastercard", "amex", "other"].includes(scheme)) {
    redirect(`/dashboard/credit-cards/${id}?error=Invalid+scheme`);
  }
  if (!/^\d{4}$/.test(card_last_four)) {
    redirect(`/dashboard/credit-cards/${id}?error=Last+4+digits+must+be+exactly+4+numbers`);
  }

  const monthly_cost = monthly_cost_raw === null ? null : Number.parseFloat(monthly_cost_raw);
  if (monthly_cost != null && (Number.isNaN(monthly_cost) || monthly_cost < 0)) {
    redirect(`/dashboard/credit-cards/${id}?error=Invalid+monthly+cost`);
  }
  const charge_day_of_month =
    charge_day_of_month_raw === null ? null : Number.parseInt(charge_day_of_month_raw, 10);
  if (
    charge_day_of_month != null &&
    (Number.isNaN(charge_day_of_month) || charge_day_of_month < 1 || charge_day_of_month > 31)
  ) {
    redirect(`/dashboard/credit-cards/${id}?error=Charge+day+must+be+between+1+and+31`);
  }

  if (!expiry_month_year_raw) {
    redirect(`/dashboard/credit-cards/${id}?error=Expiry+date+is+required+(MM/YY)`);
  }

  const expiry_date = parseExpiryMonthYear(expiry_month_year_raw);
  if (!expiry_date) {
    redirect(`/dashboard/credit-cards/${id}?error=Invalid+expiry+date.+Use+MM/YY`);
  }
  let website_url: string | null = null;
  try {
    website_url = normalizeWebsiteUrl(website_url_raw);
  } catch {
    redirect(`/dashboard/credit-cards/${id}?error=Invalid+website+URL`);
  }

  if (status !== "active" && status !== "cancelled") {
    redirect(`/dashboard/credit-cards/${id}?error=Invalid+status`);
  }

  let cancelled_at: Date | null = null;
  if (status === "cancelled") {
    if (!cancelled_at_raw || !notes) {
      redirect(`/dashboard/credit-cards/${id}?error=Cancellation+date+and+notes+are+required+when+status+is+Cancelled`);
    }
    cancelled_at = new Date(cancelled_at_raw);
    if (Number.isNaN(cancelled_at.getTime())) {
      redirect(`/dashboard/credit-cards/${id}?error=Invalid+cancellation+date`);
    }
  }

  const [member, bankAccount] = await Promise.all([
    prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
      select: { id: true },
    }),
    prisma.bank_accounts.findFirst({
      where: { id: settlement_bank_account_id, household_id: householdId },
      select: { id: true },
    }),
  ]);
  if (!member) redirect(`/dashboard/credit-cards/${id}?error=Invalid+family+member`);
  if (!bankAccount) redirect(`/dashboard/credit-cards/${id}?error=Invalid+settlement+account`);

  try {
    await prisma.credit_cards.updateMany({
      where: { id, household_id: householdId },
      data: {
        card_name,
        scheme: scheme as "visa" | "mastercard" | "amex" | "other",
        issuer_name,
        co_brand,
        product_name,
        card_last_four,
        digital_wallet_identifier,
        charge_day_of_month,
        monthly_cost,
        expiry_date,
        family_member_id,
        settlement_bank_account_id,
        currency,
        notes,
        website_url,
        cancelled_at: status === "cancelled" ? cancelled_at : null,
        is_active: status !== "cancelled",
      },
    });
  } catch {
    if (monthly_cost === null) {
      redirect(`/dashboard/credit-cards/${id}?error=Monthly+cost+blank+requires+latest+credit+card+migration`);
    }
    throw new Error("Failed to update credit card");
  }

  revalidatePath("/dashboard/credit-cards");
  revalidatePath(`/dashboard/credit-cards/${id}`);
  redirect(`/dashboard/credit-cards/${id}?updated=1`);
}
