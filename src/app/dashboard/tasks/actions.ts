"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function normalizeUrl(raw: string | null | undefined) {
  const value = raw?.trim();
  if (!value) return { url: null as string | null, valid: true };
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { url: null as string | null, valid: false };
    }
    return { url: parsed.toString(), valid: true };
  } catch {
    return { url: null as string | null, valid: false };
  }
}

export async function createTask(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/tasks?error=No+household");

  const subject = (formData.get("subject") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const type = ((formData.get("type") as string | null)?.trim() || "manual") as "manual" | "automatic";
  const priority = ((formData.get("priority") as string | null)?.trim() || "medium") as "high" | "medium" | "low";
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const assigned_user_id = (formData.get("assigned_user_id") as string | null)?.trim() || null;
  const link1Title = (formData.get("link_1_title") as string | null)?.trim() || null;
  const link2Title = (formData.get("link_2_title") as string | null)?.trim() || null;
  const link1UrlInput = (formData.get("link_1_url") as string | null) ?? null;
  const link2UrlInput = (formData.get("link_2_url") as string | null) ?? null;

  if (!subject) redirect("/dashboard/tasks?error=Subject+is+required");
  if (family_member_id && assigned_user_id) {
    redirect("/dashboard/tasks?error=Select+only+one+assignee");
  }

  const normalizedLink1 = normalizeUrl(link1UrlInput);
  const normalizedLink2 = normalizeUrl(link2UrlInput);
  if (!normalizedLink1.valid || !normalizedLink2.valid) {
    redirect("/dashboard/tasks?error=Links+must+use+valid+http(s)+URLs");
  }
  if ((link1Title && !normalizedLink1.url) || (!link1Title && normalizedLink1.url)) {
    redirect("/dashboard/tasks?error=Link+1+requires+both+title+and+URL");
  }
  if ((link2Title && !normalizedLink2.url) || (!link2Title && normalizedLink2.url)) {
    redirect("/dashboard/tasks?error=Link+2+requires+both+title+and+URL");
  }

  let finalFamilyMemberId: string | null = null;
  let finalAssignedUserId: string | null = null;
  if (family_member_id) {
    const fm = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
    });
    if (!fm) redirect("/dashboard/tasks?error=Invalid+family+member+assignee");
    finalFamilyMemberId = family_member_id;
  } else if (assigned_user_id) {
    const u = await prisma.users.findFirst({
      where: { id: assigned_user_id, household_id: householdId, user_type: "financial_advisor", is_active: true },
    });
    if (!u) redirect("/dashboard/tasks?error=Invalid+advisor+assignee");
    finalAssignedUserId = assigned_user_id;
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
      link_1_title: link1Title,
      link_1_url: normalizedLink1.url,
      link_2_title: link2Title,
      link_2_url: normalizedLink2.url,
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
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const assigned_user_id = (formData.get("assigned_user_id") as string | null)?.trim() || null;
  const link1Title = (formData.get("link_1_title") as string | null)?.trim() || null;
  const link2Title = (formData.get("link_2_title") as string | null)?.trim() || null;
  const link1UrlInput = (formData.get("link_1_url") as string | null) ?? null;
  const link2UrlInput = (formData.get("link_2_url") as string | null) ?? null;

  if (family_member_id && assigned_user_id) {
    redirect("/dashboard/tasks?error=Select+only+one+assignee");
  }
  const normalizedLink1 = normalizeUrl(link1UrlInput);
  const normalizedLink2 = normalizeUrl(link2UrlInput);
  if (!normalizedLink1.valid || !normalizedLink2.valid) {
    redirect("/dashboard/tasks?error=Links+must+use+valid+http(s)+URLs");
  }
  if ((link1Title && !normalizedLink1.url) || (!link1Title && normalizedLink1.url)) {
    redirect("/dashboard/tasks?error=Link+1+requires+both+title+and+URL");
  }
  if ((link2Title && !normalizedLink2.url) || (!link2Title && normalizedLink2.url)) {
    redirect("/dashboard/tasks?error=Link+2+requires+both+title+and+URL");
  }

  let finalFamilyMemberId: string | null = null;
  let finalAssignedUserId: string | null = null;
  if (family_member_id) {
    const fm = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
    });
    if (!fm) redirect("/dashboard/tasks?error=Invalid+family+member+assignee");
    finalFamilyMemberId = family_member_id;
  } else if (assigned_user_id) {
    const u = await prisma.users.findFirst({
      where: { id: assigned_user_id, household_id: householdId, user_type: "financial_advisor", is_active: true },
    });
    if (!u) redirect("/dashboard/tasks?error=Invalid+advisor+assignee");
    finalAssignedUserId = assigned_user_id;
  }

  const data: Record<string, unknown> = {};
  if (subject !== undefined && subject !== null) data.subject = subject;
  if (description !== undefined) data.description = description || null;
  data.link_1_title = link1Title;
  data.link_1_url = normalizedLink1.url;
  data.link_2_title = link2Title;
  data.link_2_url = normalizedLink2.url;
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
