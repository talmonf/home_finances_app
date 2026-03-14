"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSubscription(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/subscriptions?error=No+household");
  }

  const name = (formData.get("name") as string | null)?.trim();
  const start_date_raw = (formData.get("start_date") as string | null)?.trim();
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim();
  const fee_amount_raw = (formData.get("fee_amount") as string | null)?.trim();
  const billing_interval = (formData.get("billing_interval") as string | null)?.trim();
  const credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!name || !start_date_raw || !renewal_date_raw || !fee_amount_raw || !billing_interval) {
    redirect("/dashboard/subscriptions?error=Required+fields+missing");
  }
  if (billing_interval !== "monthly" && billing_interval !== "annual") {
    redirect("/dashboard/subscriptions?error=Invalid+billing+interval");
  }

  const fee_amount = parseFloat(fee_amount_raw);
  if (Number.isNaN(fee_amount) || fee_amount < 0) {
    redirect("/dashboard/subscriptions?error=Invalid+fee+amount");
  }

  if (credit_card_id) {
    const card = await prisma.credit_cards.findFirst({
      where: { id: credit_card_id, household_id: householdId },
    });
    if (!card) {
      redirect("/dashboard/subscriptions?error=Invalid+credit+card");
    }
  }

  const start_date = new Date(start_date_raw);
  const renewal_date = new Date(renewal_date_raw);

  await prisma.subscriptions.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      start_date,
      renewal_date,
      fee_amount,
      billing_interval: billing_interval as "monthly" | "annual",
      credit_card_id,
      description,
    },
  });

  revalidatePath("/dashboard/subscriptions");
  redirect("/dashboard/subscriptions?created=1");
}

export async function toggleSubscriptionActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/subscriptions?error=No+household");
  }

  await prisma.subscriptions.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/subscriptions");
  redirect("/dashboard/subscriptions?updated=1");
}
