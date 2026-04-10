"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateTransactionRow(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/import");

  const transactionId = (formData.get("transaction_id") as string)?.trim();
  if (!transactionId) return;

  const tx = await prisma.transactions.findFirst({
    where: { id: transactionId, household_id: householdId },
  });
  if (!tx) return;

  const category_id = (formData.get("category_id") as string)?.trim() || null;
  const payee_id = (formData.get("payee_id") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const family_member_id = (formData.get("family_member_id") as string)?.trim() || null;
  const study_or_class_id = (formData.get("study_or_class_id") as string)?.trim() || null;
  const rental_id = (formData.get("rental_id") as string)?.trim() || null;
  const trip_id = (formData.get("trip_id") as string)?.trim() || null;
  const car_id = (formData.get("car_id") as string)?.trim() || null;
  const job_id_raw = (formData.get("job_id") as string)?.trim() || null;
  const subscription_id_raw = (formData.get("subscription_id") as string)?.trim() || null;

  const significant_purchase_id = (formData.get("significant_purchase_id") as string)?.trim() || null;
  const purchase_category_raw = (formData.get("purchase_category") as string)?.trim() || null;

  const PURCHASE_CATEGORIES = ["electronics", "appliances", "tools", "other"] as const;
  type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number];
  const purchase_category =
    purchase_category_raw && (PURCHASE_CATEGORIES as readonly string[]).includes(purchase_category_raw)
      ? (purchase_category_raw as PurchaseCategory)
      : null;

  let subscription_id: string | null = null;
  let subscriptionDefaults: { job_id: string | null; family_member_id: string | null } | null = null;
  if (subscription_id_raw) {
    const sub = await prisma.subscriptions.findFirst({
      where: { id: subscription_id_raw, household_id: householdId },
      select: { id: true, job_id: true, family_member_id: true },
    });
    if (sub) {
      subscription_id = sub.id;
      subscriptionDefaults = { job_id: sub.job_id, family_member_id: sub.family_member_id };
    }
  }

  let resolved_job_id: string | null = null;
  if (job_id_raw) {
    const jobRow = await prisma.jobs.findFirst({
      where: { id: job_id_raw, household_id: householdId },
    });
    if (jobRow) resolved_job_id = jobRow.id;
  }
  if (subscription_id && subscriptionDefaults) {
    resolved_job_id = resolved_job_id ?? subscriptionDefaults.job_id ?? null;
  }

  const data: Record<string, string | null> & { significant_purchase_id?: string | null } = {
    notes,
    category_id: category_id || null,
    payee_id: payee_id || null,
    family_member_id: family_member_id || null,
    study_or_class_id: study_or_class_id || null,
    significant_purchase_id,
    rental_id,
    trip_id,
    car_id,
    job_id: resolved_job_id,
    subscription_id,
  };

  if (category_id) {
    const cat = await prisma.categories.findFirst({
      where: { id: category_id, household_id: householdId },
    });
    if (!cat) data.category_id = null;
  }
  if (payee_id) {
    const payee = await prisma.payees.findFirst({
      where: { id: payee_id, household_id: householdId },
    });
    if (!payee) data.payee_id = null;
  }
  if (family_member_id) {
    const fm = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
    });
    if (!fm) data.family_member_id = null;
  }
  if (subscription_id && subscriptionDefaults && !data.family_member_id) {
    if (subscriptionDefaults.family_member_id) {
      const fm = await prisma.family_members.findFirst({
        where: { id: subscriptionDefaults.family_member_id, household_id: householdId },
      });
      data.family_member_id = fm ? fm.id : null;
    }
  }
  if (study_or_class_id) {
    const sc = await prisma.studies_and_classes.findFirst({
      where: { id: study_or_class_id, household_id: householdId },
    });
    if (!sc) data.study_or_class_id = null;
  }

  if (significant_purchase_id) {
    const sp = await prisma.significant_purchases.findFirst({
      where: { id: significant_purchase_id, household_id: householdId },
    });
    if (!sp) data.significant_purchase_id = null;
  }
  if (rental_id) {
    const rental = await prisma.rentals.findFirst({
      where: { id: rental_id, household_id: householdId },
    });
    if (!rental) data.rental_id = null;
  }
  if (trip_id) {
    const trip = await prisma.trips.findFirst({
      where: { id: trip_id, household_id: householdId },
    });
    if (!trip) data.trip_id = null;
  }
  if (car_id) {
    const car = await prisma.cars.findFirst({
      where: { id: car_id, household_id: householdId },
    });
    if (!car) data.car_id = null;
  }

  await prisma.transactions.update({
    where: { id: transactionId },
    data,
  });

  // Optionally update purchase category on the linked significant purchase.
  if (significant_purchase_id && purchase_category) {
    await prisma.significant_purchases.updateMany({
      where: { id: significant_purchase_id, household_id: householdId },
      data: { purchase_category },
    });
  }

  revalidatePath("/dashboard/import");
  revalidatePath("/dashboard/import/review");
  revalidatePath("/dashboard/significant-purchases");
  revalidatePath("/dashboard/transactions");
}

export async function confirmAllTransactionsForDocument(documentId: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/import");

  const doc = await prisma.documents.findFirst({
    where: { id: documentId, household_id: householdId },
  });
  if (!doc) redirect("/dashboard/import?error=Document+not+found");

  await prisma.transactions.updateMany({
    where: { document_id: documentId, household_id: householdId },
    data: { import_status: "confirmed" },
  });

  revalidatePath("/dashboard/import");
  revalidatePath(`/dashboard/import/review/${documentId}`);
  redirect(`/dashboard/import/review/${documentId}?confirmed=1`);
}

export async function createCategory(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/import");

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  await prisma.categories.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
    },
  });
  revalidatePath("/dashboard/import");
  revalidatePath("/dashboard/import/review");
}

export async function createPayee(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/import");

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  await prisma.payees.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
    },
  });
  revalidatePath("/dashboard/import");
  revalidatePath("/dashboard/import/review");
}
