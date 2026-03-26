"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const METHOD_TYPES = ["bit", "paybox", "paypal", "other"] as const;
type MethodType = (typeof METHOD_TYPES)[number];

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

  await prisma.digital_payment_methods.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      method_type,
      linked_bank_account_id,
      notes,
      website_url,
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

  await prisma.digital_payment_methods.updateMany({
    where: { id, household_id: householdId },
    data: { name, method_type, notes, website_url, linked_bank_account_id },
  });

  revalidatePath("/dashboard/digital-payment-methods");
  redirect("/dashboard/digital-payment-methods?updated=1");
}
