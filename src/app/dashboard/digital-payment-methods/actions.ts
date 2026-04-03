"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const METHOD_TYPES = ["bit", "paybox", "paypal", "other"] as const;
type MethodType = (typeof METHOD_TYPES)[number];

function parseDateInput(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
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

function parseMethodType(raw: string | null): MethodType | null {
  if (!raw) return null;
  const v = raw.trim();
  return (METHOD_TYPES as readonly string[]).includes(v) ? (v as MethodType) : null;
}

async function parseLinkedBankAccountId(
  formData: FormData,
  householdId: string,
  errorRedirect: string
): Promise<string | null> {
  const raw = (formData.get("linked_bank_account_id") as string | null)?.trim() || "";
  if (!raw) return null;
  const acc = await prisma.bank_accounts.findFirst({
    where: { id: raw, household_id: householdId },
    select: { id: true },
  });
  if (!acc) {
    redirect(errorRedirect);
  }
  return acc.id;
}

export async function createDigitalPaymentMethod(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/digital-payment-methods?error=No+household");
  }

  const name = (formData.get("name") as string | null)?.trim() || "";
  const method_type_raw = (formData.get("method_type") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const website_url_raw = (formData.get("website_url") as string | null) || null;
  const family_member_id_raw = (formData.get("family_member_id") as string | null)?.trim() || "";
  const primary_credit_card_id_raw = (formData.get("primary_credit_card_id") as string | null)?.trim() || "";
  const secondary_credit_card_id_raw = (formData.get("secondary_credit_card_id") as string | null)?.trim() || "";
  const date_created_raw = (formData.get("date_created") as string | null)?.trim() || "";

  if (!name) {
    redirect("/dashboard/digital-payment-methods?error=Name+is+required");
  }

  const method_type = parseMethodType(method_type_raw);
  if (!method_type) {
    redirect("/dashboard/digital-payment-methods?error=Invalid+method+type");
  }
  let website_url: string | null = null;
  try {
    website_url = normalizeWebsiteUrl(website_url_raw);
  } catch {
    redirect("/dashboard/digital-payment-methods?error=Invalid+website+URL");
  }

  const linked_bank_account_id = await parseLinkedBankAccountId(
    formData,
    householdId,
    "/dashboard/digital-payment-methods?error=Invalid+linked+bank+account"
  );

  const family_member_id = family_member_id_raw || null;
  if (family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId, is_active: true },
      select: { id: true },
    });
    if (!member) {
      redirect("/dashboard/digital-payment-methods?error=Invalid+family+member");
    }
  }

  const primary_credit_card_id = primary_credit_card_id_raw || null;
  if (primary_credit_card_id) {
    const card = await prisma.credit_cards.findFirst({
      where: { id: primary_credit_card_id, household_id: householdId },
      select: { id: true },
    });
    if (!card) {
      redirect("/dashboard/digital-payment-methods?error=Invalid+primary+credit+card");
    }
  }

  const secondary_credit_card_id = secondary_credit_card_id_raw || null;
  if (secondary_credit_card_id) {
    const card = await prisma.credit_cards.findFirst({
      where: { id: secondary_credit_card_id, household_id: householdId },
      select: { id: true },
    });
    if (!card) {
      redirect("/dashboard/digital-payment-methods?error=Invalid+secondary+credit+card");
    }
  }

  const date_created = date_created_raw ? parseDateInput(date_created_raw) : null;
  if (date_created_raw && !date_created) {
    redirect("/dashboard/digital-payment-methods?error=Invalid+created+date");
  }

  await prisma.digital_payment_methods.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      method_type,
      linked_bank_account_id,
      notes,
      website_url,
      family_member_id,
      primary_credit_card_id,
      secondary_credit_card_id,
      date_created,
    },
  });

  revalidatePath("/dashboard/digital-payment-methods");
  redirect("/dashboard/digital-payment-methods?created=1");
}

export async function toggleDigitalPaymentMethodActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/digital-payment-methods?error=No+household");
  }

  await prisma.digital_payment_methods.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/digital-payment-methods");
  redirect("/dashboard/digital-payment-methods?updated=1");
}

export async function updateDigitalPaymentMethod(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/digital-payment-methods?error=No+household");
  }

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/digital-payment-methods?error=Missing+id");

  const name = (formData.get("name") as string | null)?.trim() || "";
  const method_type_raw = (formData.get("method_type") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const website_url_raw = (formData.get("website_url") as string | null) || null;
  const family_member_id_raw = (formData.get("family_member_id") as string | null)?.trim() || "";
  const primary_credit_card_id_raw = (formData.get("primary_credit_card_id") as string | null)?.trim() || "";
  const secondary_credit_card_id_raw = (formData.get("secondary_credit_card_id") as string | null)?.trim() || "";
  const date_created_raw = (formData.get("date_created") as string | null)?.trim() || "";

  if (!name) {
    redirect(`/dashboard/digital-payment-methods/${encodeURIComponent(id)}?error=Name+is+required`);
  }

  const method_type = parseMethodType(method_type_raw);
  if (!method_type) {
    redirect(`/dashboard/digital-payment-methods/${encodeURIComponent(id)}?error=Invalid+method+type`);
  }
  let website_url: string | null = null;
  try {
    website_url = normalizeWebsiteUrl(website_url_raw);
  } catch {
    redirect(`/dashboard/digital-payment-methods/${encodeURIComponent(id)}?error=Invalid+website+URL`);
  }

  const linked_bank_account_id = await parseLinkedBankAccountId(
    formData,
    householdId,
    `/dashboard/digital-payment-methods/${encodeURIComponent(id)}?error=Invalid+linked+bank+account`
  );

  const family_member_id = family_member_id_raw || null;
  if (family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId, is_active: true },
      select: { id: true },
    });
    if (!member) {
      redirect(
        `/dashboard/digital-payment-methods/${encodeURIComponent(id)}?error=Invalid+family+member`,
      );
    }
  }

  const primary_credit_card_id = primary_credit_card_id_raw || null;
  if (primary_credit_card_id) {
    const card = await prisma.credit_cards.findFirst({
      where: { id: primary_credit_card_id, household_id: householdId },
      select: { id: true },
    });
    if (!card) {
      redirect(
        `/dashboard/digital-payment-methods/${encodeURIComponent(id)}?error=Invalid+primary+credit+card`,
      );
    }
  }

  const secondary_credit_card_id = secondary_credit_card_id_raw || null;
  if (secondary_credit_card_id) {
    const card = await prisma.credit_cards.findFirst({
      where: { id: secondary_credit_card_id, household_id: householdId },
      select: { id: true },
    });
    if (!card) {
      redirect(
        `/dashboard/digital-payment-methods/${encodeURIComponent(id)}?error=Invalid+secondary+credit+card`,
      );
    }
  }

  const date_created = date_created_raw ? parseDateInput(date_created_raw) : null;
  if (date_created_raw && !date_created) {
    redirect(
      `/dashboard/digital-payment-methods/${encodeURIComponent(id)}?error=Invalid+created+date`,
    );
  }

  await prisma.digital_payment_methods.updateMany({
    where: { id, household_id: householdId },
    data: {
      name,
      method_type,
      notes,
      website_url,
      linked_bank_account_id,
      family_member_id,
      primary_credit_card_id,
      secondary_credit_card_id,
      date_created,
    },
  });

  revalidatePath("/dashboard/digital-payment-methods");
  redirect("/dashboard/digital-payment-methods?updated=1");
}
