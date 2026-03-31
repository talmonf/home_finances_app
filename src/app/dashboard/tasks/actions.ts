"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTask(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/tasks?error=No+household");

  const subject = (formData.get("subject") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const type = ((formData.get("type") as string | null)?.trim() || "manual") as "manual" | "automatic";
  const priority = ((formData.get("priority") as string | null)?.trim() || "medium") as "high" | "medium" | "low";
  const assigneeKind = (formData.get("assignee_kind") as string | null)?.trim() || "";
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const assigned_user_id = (formData.get("assigned_user_id") as string | null)?.trim() || null;

  if (!subject) redirect("/dashboard/tasks?error=Subject+is+required");

  let finalFamilyMemberId: string | null = null;
  let finalAssignedUserId: string | null = null;
  if (assigneeKind === "family_member" && family_member_id) {
    const fm = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
    });
    if (fm) finalFamilyMemberId = family_member_id;
  } else if (assigneeKind === "advisor" && assigned_user_id) {
    const u = await prisma.users.findFirst({
      where: { id: assigned_user_id, household_id: householdId, user_type: "financial_advisor", is_active: true },
    });
    if (u) finalAssignedUserId = assigned_user_id;
  }

  await prisma.tasks.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      type,
      status: "open",
      priority,
      subject,
      description: description || null,
      family_member_id: finalFamilyMemberId,
      assigned_user_id: finalAssignedUserId,
    },
  });

  revalidatePath("/dashboard/tasks");
  redirect("/dashboard/tasks?created=1");
}

export async function updateTask(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/tasks");

  const taskId = (formData.get("task_id") as string)?.trim();
  if (!taskId) redirect("/dashboard/tasks?error=Task+not+found");

  const task = await prisma.tasks.findFirst({
    where: { id: taskId, household_id: householdId },
  });
  if (!task) redirect("/dashboard/tasks?error=Task+not+found");

  const subject = (formData.get("subject") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() ?? undefined;
  const status = (formData.get("status") as string | null)?.trim();
  const priority = (formData.get("priority") as string | null)?.trim();
  const assigneeKind = (formData.get("assignee_kind") as string | null)?.trim() || "";
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const assigned_user_id = (formData.get("assigned_user_id") as string | null)?.trim() || null;

  let finalFamilyMemberId: string | null = null;
  let finalAssignedUserId: string | null = null;
  if (assigneeKind === "family_member" && family_member_id) {
    const fm = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
    });
    if (fm) finalFamilyMemberId = family_member_id;
  } else if (assigneeKind === "advisor" && assigned_user_id) {
    const u = await prisma.users.findFirst({
      where: { id: assigned_user_id, household_id: householdId, user_type: "financial_advisor", is_active: true },
    });
    if (u) finalAssignedUserId = assigned_user_id;
  }

  const data: Record<string, unknown> = {};
  if (subject !== undefined && subject !== null) data.subject = subject;
  if (description !== undefined) data.description = description || null;
  if (status && ["open", "in_work", "on_hold", "closed"].includes(status)) data.status = status;
  if (priority && ["high", "medium", "low"].includes(priority)) data.priority = priority;
  data.family_member_id = finalFamilyMemberId;
  data.assigned_user_id = finalAssignedUserId;

  await prisma.tasks.update({
    where: { id: taskId },
    data,
  });

  revalidatePath("/dashboard/tasks");
  revalidatePath(`/dashboard/tasks/${taskId}/edit`);
  redirect("/dashboard/tasks?updated=1");
}
