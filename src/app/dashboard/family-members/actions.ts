"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import {
  parseHebrewDobFromFormData,
  resolveHebrewDobForSave,
} from "@/lib/family-members/hebrew-dob-form";
import { parseGrandchildParentIds } from "@/lib/family-members/grandchild-parents";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function hebrewDobRedirectError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function resolveGrandchildParents(
  householdId: string,
  memberId: string | null,
  relationship: string | null,
  parentAId: string | null,
  parentBId: string | null,
  errorPath: string,
) {
  const parsed = parseGrandchildParentIds(relationship, parentAId, parentBId);
  const ids = [parsed.parent_a_family_member_id, parsed.parent_b_family_member_id].filter(
    (id): id is string => id != null,
  );
  if (memberId && ids.includes(memberId)) {
    hebrewDobRedirectError(errorPath, "A family member cannot be their own parent");
  }
  if (ids.length === 0) return parsed;

  const found = await prisma.family_members.findMany({
    where: { household_id: householdId, id: { in: ids } },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    hebrewDobRedirectError(errorPath, "Selected parent is not a valid family member");
  }
  return parsed;
}

export async function createFamilyMember(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/family-members?error=No+household");
  }

  const full_name = (formData.get("full_name") as string | null)?.trim();
  const date_of_birth_raw = (formData.get("date_of_birth") as string | null)?.trim();
  const id_number = (formData.get("id_number") as string | null)?.trim() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const email = (formData.get("email") as string | null)?.trim() || null;
  const relationship = (formData.get("relationship") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const user_id = (formData.get("user_id") as string | null)?.trim() || null;

  if (!full_name) {
    redirect("/dashboard/family-members?error=Name+is+required");
  }

  const date_of_birth = date_of_birth_raw ? new Date(date_of_birth_raw) : null;

  let hebrewDob;
  try {
    hebrewDob = parseHebrewDobFromFormData(formData);
  } catch {
    hebrewDobRedirectError("/dashboard/family-members", "Hebrew birthday requires both day and month");
  }
  hebrewDob = resolveHebrewDobForSave(hebrewDob, date_of_birth);

  const memberId = crypto.randomUUID();
  const parents = await resolveGrandchildParents(
    householdId,
    memberId,
    relationship,
    formData.get("parent_a_family_member_id") as string | null,
    formData.get("parent_b_family_member_id") as string | null,
    "/dashboard/family-members",
  );

  await prisma.$transaction(async (tx) => {
    await tx.family_members.create({
      data: {
        id: memberId,
        household_id: householdId,
        full_name,
        date_of_birth,
        ...hebrewDob,
        id_number,
        phone,
        email,
        relationship,
        notes,
        ...parents,
      },
    });

    if (user_id) {
      const user = await tx.users.findFirst({
        where: { id: user_id, household_id: householdId },
      });
      if (user) {
        await tx.users.updateMany({
          where: { household_id: householdId, family_member_id: memberId },
          data: { family_member_id: null },
        });
        await tx.users.updateMany({
          where: { id: user_id, household_id: householdId },
          data: { family_member_id: memberId },
        });
      }
    }
  });

  revalidatePath("/dashboard/family-members");
  redirect("/dashboard/family-members?created=1");
}

export async function toggleFamilyMemberActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/family-members?error=No+household");
  }

  await prisma.family_members.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/family-members");
  redirect("/dashboard/family-members?updated=1");
}

export async function linkUserToFamilyMember(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/family-members?error=No+household");

  const family_member_id = (formData.get("family_member_id") as string)?.trim();
  const user_id = (formData.get("user_id") as string)?.trim() || null;

  if (!family_member_id) return;

  const member = await prisma.family_members.findFirst({
    where: { id: family_member_id, household_id: householdId },
  });
  if (!member) return;

  if (user_id) {
    const user = await prisma.users.findFirst({
      where: { id: user_id, household_id: householdId },
    });
    if (!user) return;
  }

  const updates = [
    prisma.users.updateMany({
      where: { household_id: householdId, family_member_id },
      data: { family_member_id: null },
    }),
  ];
  if (user_id) {
    updates.push(
      prisma.users.updateMany({
        where: { id: user_id, household_id: householdId },
        data: { family_member_id },
      })
    );
  }
  await prisma.$transaction(updates);

  revalidatePath("/dashboard/family-members");
}

export async function updateFamilyMember(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/family-members?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/family-members?error=Missing+id");

  const member = await prisma.family_members.findFirst({
    where: { id, household_id: householdId },
  });
  if (!member) redirect("/dashboard/family-members?error=Not+found");

  const full_name = (formData.get("full_name") as string | null)?.trim();
  const date_of_birth_raw = (formData.get("date_of_birth") as string | null)?.trim();
  const id_number = (formData.get("id_number") as string | null)?.trim() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const email = (formData.get("email") as string | null)?.trim() || null;
  const relationship = (formData.get("relationship") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const user_id = (formData.get("user_id") as string | null)?.trim() || null;

  if (!full_name) {
    redirect(`/dashboard/family-members/${id}?error=Name+is+required`);
  }

  const date_of_birth = date_of_birth_raw ? new Date(date_of_birth_raw) : null;

  let hebrewDob;
  try {
    hebrewDob = parseHebrewDobFromFormData(formData);
  } catch {
    hebrewDobRedirectError(`/dashboard/family-members/${id}`, "Hebrew birthday requires both day and month");
  }
  hebrewDob = resolveHebrewDobForSave(hebrewDob, date_of_birth);

  const parents = await resolveGrandchildParents(
    householdId,
    id,
    relationship,
    formData.get("parent_a_family_member_id") as string | null,
    formData.get("parent_b_family_member_id") as string | null,
    `/dashboard/family-members/${id}`,
  );

  await prisma.$transaction(async (tx) => {
    await tx.family_members.updateMany({
      where: { id, household_id: householdId },
      data: {
        full_name,
        date_of_birth,
        ...hebrewDob,
        id_number,
        phone,
        email,
        relationship,
        notes,
        ...parents,
      },
    });

    const updates = [
      tx.users.updateMany({
        where: { household_id: householdId, family_member_id: id },
        data: { family_member_id: null },
      }),
    ];

    if (user_id) {
      const user = await tx.users.findFirst({
        where: { id: user_id, household_id: householdId },
      });
      if (user) {
        updates.push(
          tx.users.updateMany({
            where: { id: user_id, household_id: householdId },
            data: { family_member_id: id },
          }),
        );
      }
    }

    await tx.$transaction(updates);
  });

  revalidatePath("/dashboard/family-members");
  redirect("/dashboard/family-members?updated=1");
}

