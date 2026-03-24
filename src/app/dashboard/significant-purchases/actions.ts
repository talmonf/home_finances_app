"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PURCHASE_CATEGORIES = ["electronics", "appliances", "tools", "other"] as const;
type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number];

const PURCHASE_SOURCE_TYPES = ["credit_card", "present", "other"] as const;
type SignificantPurchaseSourceType = (typeof PURCHASE_SOURCE_TYPES)[number];

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parsePurchaseCategory(raw: string | null): PurchaseCategory | null {
  if (!raw) return null;
  const v = raw.trim();
  return (PURCHASE_CATEGORIES as readonly string[]).includes(v) ? (v as PurchaseCategory) : null;
}

function parsePurchaseSourceType(raw: string | null): SignificantPurchaseSourceType | null {
  if (!raw) return null;
  const v = raw.trim();
  return (PURCHASE_SOURCE_TYPES as readonly string[]).includes(v) ? (v as SignificantPurchaseSourceType) : null;
}

export async function createSignificantPurchase(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/significant-purchases?error=No+household");

  const item_name = (formData.get("item_name") as string | null)?.trim() || "";
  const purchase_date_raw = (formData.get("purchase_date") as string | null)?.trim() || "";
  const warranty_expiry_date_raw = (formData.get("warranty_expiry_date") as string | null)?.trim() || null;
  const purchase_category_raw = (formData.get("purchase_category") as string | null)?.trim() || null;
  const purchase_source_type_raw = (formData.get("purchase_source_type") as string | null)?.trim() || null;
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!item_name || !purchase_date_raw || !purchase_category_raw || !purchase_source_type_raw) {
    redirect(
      "/dashboard/significant-purchases?error=Item+name,+purchase+date,+category+and+source+are+required"
    );
  }

  const purchase_category = parsePurchaseCategory(purchase_category_raw);
  if (!purchase_category) redirect("/dashboard/significant-purchases?error=Invalid+purchase+category");

  const purchase_source_type = parsePurchaseSourceType(purchase_source_type_raw);
  if (!purchase_source_type) redirect("/dashboard/significant-purchases?error=Invalid+purchase+source");

  const purchase_date = new Date(purchase_date_raw);
  if (Number.isNaN(purchase_date.getTime())) {
    redirect("/dashboard/significant-purchases?error=Invalid+purchase+date");
  }

  const warranty_expiry_date = warranty_expiry_date_raw ? new Date(warranty_expiry_date_raw) : null;
  if (warranty_expiry_date && Number.isNaN(warranty_expiry_date.getTime())) {
    redirect("/dashboard/significant-purchases?error=Invalid+warranty+expiry+date");
  }

  if (family_member_id) {
    const fm = await prisma.family_members.findFirst({ where: { id: family_member_id, household_id: householdId } });
    if (!fm) redirect("/dashboard/significant-purchases?error=Invalid+family+member");
  }

  const final_credit_card_id =
    purchase_source_type === "credit_card" ? credit_card_id : null;

  if (purchase_source_type === "credit_card" && !final_credit_card_id) {
    redirect("/dashboard/significant-purchases?error=Credit+card+is+required+for+credit+card+source");
  }

  if (final_credit_card_id) {
    const today = startOfToday();
    const card = await prisma.credit_cards.findFirst({
      where: {
        id: final_credit_card_id,
        household_id: householdId,
        cancelled_at: null,
        OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
      },
    });
    if (!card) {
      redirect("/dashboard/significant-purchases?error=Credit+card+must+be+active+and+not+expired");
    }
  }

  await prisma.significant_purchases.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      family_member_id,
      credit_card_id: final_credit_card_id,
      purchase_date,
      warranty_expiry_date,
      purchase_category,
      purchase_source_type,
      item_name,
      notes,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/significant-purchases");
  redirect("/dashboard/significant-purchases?created=1");
}

export async function toggleSignificantPurchaseActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/significant-purchases?error=No+household");

  await prisma.significant_purchases.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/significant-purchases");
  redirect("/dashboard/significant-purchases?updated=1");
}

