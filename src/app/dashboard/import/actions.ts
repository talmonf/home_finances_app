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

  const data: Record<string, string | null> = {
    notes,
    category_id: category_id || null,
    payee_id: payee_id || null,
    family_member_id: family_member_id || null,
    study_or_class_id: study_or_class_id || null,
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
  if (study_or_class_id) {
    const sc = await prisma.studies_and_classes.findFirst({
      where: { id: study_or_class_id, household_id: householdId },
    });
    if (!sc) data.study_or_class_id = null;
  }

  await prisma.transactions.update({
    where: { id: transactionId },
    data,
  });

  revalidatePath("/dashboard/import");
  revalidatePath("/dashboard/import/review");
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
