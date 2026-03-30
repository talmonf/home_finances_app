"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

export async function createSubscription(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/subscriptions?error=No+household");
  }

  const name = (formData.get("name") as string | null)?.trim();
  const start_date_raw = (formData.get("start_date") as string | null)?.trim() || null;
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim() || null;
  const fee_amount_raw = (formData.get("fee_amount") as string | null)?.trim();
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const billing_interval = (formData.get("billing_interval") as string | null)?.trim();
  const credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const status = (formData.get("status") as string | null)?.trim() || "active";
  const cancelled_at_raw = (formData.get("cancelled_at") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const website_url_raw = (formData.get("website_url") as string | null) || null;

  if (!name || !fee_amount_raw || !billing_interval) {
    redirect("/dashboard/subscriptions?error=Required+fields+missing");
  }
  if (status !== "active" && status !== "cancelled") {
    redirect("/dashboard/subscriptions?error=Invalid+status");
  }
  if (billing_interval !== "monthly" && billing_interval !== "annual") {
    redirect("/dashboard/subscriptions?error=Invalid+billing+interval");
  }

  const fee_amount = parseFloat(fee_amount_raw);
  if (Number.isNaN(fee_amount) || fee_amount < 0) {
    redirect("/dashboard/subscriptions?error=Invalid+fee+amount");
  }
  let website_url: string | null = null;
  try {
    website_url = normalizeWebsiteUrl(website_url_raw);
  } catch {
    redirect("/dashboard/subscriptions?error=Invalid+website+URL");
  }

  if (credit_card_id) {
    const today = startOfToday();
    const card = await prisma.credit_cards.findFirst({
      where: {
        id: credit_card_id,
        household_id: householdId,
        cancelled_at: null,
        OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
      },
    });
    if (!card) {
      redirect("/dashboard/subscriptions?error=Credit+card+must+be+active+and+not+expired");
    }
  }

  if (family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
      select: { id: true },
    });
    if (!member) {
      redirect("/dashboard/subscriptions?error=Invalid+family+member");
    }
  }

  let start_date: Date | null = null;
  if (start_date_raw) {
    start_date = new Date(start_date_raw);
    if (Number.isNaN(start_date.getTime())) {
      redirect("/dashboard/subscriptions?error=Invalid+start+date");
    }
  }

  let renewal_date: Date | null = null;
  if (renewal_date_raw) {
    renewal_date = new Date(renewal_date_raw);
    if (Number.isNaN(renewal_date.getTime())) {
      redirect("/dashboard/subscriptions?error=Invalid+renewal+date");
    }
  }

  let cancelled_at: Date | null = null;
  if (status === "cancelled") {
    if (!cancelled_at_raw) {
      redirect("/dashboard/subscriptions?error=Cancellation+date+required");
    }
    cancelled_at = new Date(cancelled_at_raw);
    if (Number.isNaN(cancelled_at.getTime())) {
      redirect("/dashboard/subscriptions?error=Invalid+cancelled+date");
    }
  }

  await prisma.subscriptions.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      start_date,
      renewal_date,
      fee_amount,
      currency,
      billing_interval: billing_interval as "monthly" | "annual",
      credit_card_id,
      family_member_id,
      description,
      website_url,
      is_active: status === "active",
      cancelled_at,
    },
  });

  revalidatePath("/dashboard/subscriptions");
  redirect("/dashboard/subscriptions?created=1");
}

export async function updateSubscription(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/subscriptions?error=No+household");
  }

  const id = (formData.get("id") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const start_date_raw = (formData.get("start_date") as string | null)?.trim() || null;
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim() || null;
  const fee_amount_raw = (formData.get("fee_amount") as string | null)?.trim();
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const billing_interval = (formData.get("billing_interval") as string | null)?.trim();
  const credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const status = (formData.get("status") as string | null)?.trim() || "active";
  const cancelled_at_raw = (formData.get("cancelled_at") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const website_url_raw = (formData.get("website_url") as string | null) || null;

  if (!id || !name || !fee_amount_raw || !billing_interval) {
    redirect("/dashboard/subscriptions?error=Required+fields+missing");
  }
  if (status !== "active" && status !== "cancelled") {
    redirect(`/dashboard/subscriptions/${id}?error=Invalid+status`);
  }
  if (billing_interval !== "monthly" && billing_interval !== "annual") {
    redirect(`/dashboard/subscriptions/${id}?error=Invalid+billing+interval`);
  }

  const fee_amount = parseFloat(fee_amount_raw);
  if (Number.isNaN(fee_amount) || fee_amount < 0) {
    redirect(`/dashboard/subscriptions/${id}?error=Invalid+fee+amount`);
  }
  let website_url: string | null = null;
  try {
    website_url = normalizeWebsiteUrl(website_url_raw);
  } catch {
    redirect(`/dashboard/subscriptions/${id}?error=Invalid+website+URL`);
  }

  if (credit_card_id) {
    const today = startOfToday();
    const card = await prisma.credit_cards.findFirst({
      where: {
        id: credit_card_id,
        household_id: householdId,
        cancelled_at: null,
        OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
      },
    });
    if (!card) {
      redirect(`/dashboard/subscriptions/${id}?error=Credit+card+must+be+active+and+not+expired`);
    }
  }

  if (family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
      select: { id: true },
    });
    if (!member) {
      redirect(`/dashboard/subscriptions/${id}?error=Invalid+family+member`);
    }
  }

  let start_date: Date | null = null;
  if (start_date_raw) {
    start_date = new Date(start_date_raw);
    if (Number.isNaN(start_date.getTime())) {
      redirect(`/dashboard/subscriptions/${id}?error=Invalid+start+date`);
    }
  }

  let renewal_date: Date | null = null;
  if (renewal_date_raw) {
    renewal_date = new Date(renewal_date_raw);
    if (Number.isNaN(renewal_date.getTime())) {
      redirect(`/dashboard/subscriptions/${id}?error=Invalid+renewal+date`);
    }
  }

  let cancelled_at: Date | null = null;
  if (status === "cancelled") {
    if (!cancelled_at_raw) {
      redirect(`/dashboard/subscriptions/${id}?error=Cancellation+date+required`);
    }
    cancelled_at = new Date(cancelled_at_raw);
    if (Number.isNaN(cancelled_at.getTime())) {
      redirect(`/dashboard/subscriptions/${id}?error=Invalid+cancelled+date`);
    }
  }

  await prisma.subscriptions.updateMany({
    where: { id, household_id: householdId },
    data: {
      name,
      start_date,
      renewal_date,
      fee_amount,
      currency,
      billing_interval: billing_interval as "monthly" | "annual",
      credit_card_id,
      family_member_id,
      description,
      website_url,
      is_active: status === "active",
      cancelled_at,
    },
  });

  revalidatePath("/dashboard/subscriptions");
  revalidatePath(`/dashboard/subscriptions/${id}`);
  redirect(`/dashboard/subscriptions/${id}?updated=1`);
}

