"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseDateInput(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function createTrip(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/trips?error=No+household");

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) redirect("/dashboard/trips?error=Name+is+required");

  const trip_type = (formData.get("trip_type") as string | null)?.trim() || null;
  const city = (formData.get("city") as string | null)?.trim() || null;
  const country = (formData.get("country") as string | null)?.trim() || null;
  const start_date = parseDateInput((formData.get("start_date") as string | null)?.trim() || null);
  const end_date = parseDateInput((formData.get("end_date") as string | null)?.trim() || null);
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const memberIds = formData.getAll("family_member_ids").map((v) => String(v).trim()).filter(Boolean);

  const members = memberIds.length
    ? await prisma.family_members.findMany({
        where: { id: { in: memberIds }, household_id: householdId },
        select: { id: true },
      })
    : [];
  if (memberIds.length !== members.length) redirect("/dashboard/trips?error=Invalid+family+member+selection");

  const trip = await prisma.trips.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      trip_type,
      city,
      country,
      start_date,
      end_date,
      notes,
    },
  });

  if (memberIds.length) {
    await prisma.trip_family_members.createMany({
      data: memberIds.map((family_member_id) => ({
        id: crypto.randomUUID(),
        trip_id: trip.id,
        family_member_id,
      })),
    });
  }

  revalidatePath("/dashboard/trips");
  redirect("/dashboard/trips?created=1");
}

export async function updateTrip(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/trips?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  if (!id || !name) redirect("/dashboard/trips?error=Missing+required+fields");

  const trip = await prisma.trips.findFirst({
    where: { id, household_id: householdId },
    select: { id: true },
  });
  if (!trip) redirect("/dashboard/trips?error=Trip+not+found");

  const memberIds = formData.getAll("family_member_ids").map((v) => String(v).trim()).filter(Boolean);
  const members = memberIds.length
    ? await prisma.family_members.findMany({
        where: { id: { in: memberIds }, household_id: householdId },
        select: { id: true },
      })
    : [];
  if (memberIds.length !== members.length) redirect(`/dashboard/trips?error=Invalid+family+member+selection`);

  await prisma.trips.update({
    where: { id },
    data: {
      name,
      trip_type: (formData.get("trip_type") as string | null)?.trim() || null,
      city: (formData.get("city") as string | null)?.trim() || null,
      country: (formData.get("country") as string | null)?.trim() || null,
      start_date: parseDateInput((formData.get("start_date") as string | null)?.trim() || null),
      end_date: parseDateInput((formData.get("end_date") as string | null)?.trim() || null),
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  await prisma.trip_family_members.deleteMany({ where: { trip_id: id } });
  if (memberIds.length) {
    await prisma.trip_family_members.createMany({
      data: memberIds.map((family_member_id) => ({
        id: crypto.randomUUID(),
        trip_id: id,
        family_member_id,
      })),
    });
  }

  revalidatePath("/dashboard/trips");
  redirect("/dashboard/trips?updated=1");
}

export async function deleteTrip(id: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  await prisma.trips.deleteMany({ where: { id, household_id: householdId } });
  revalidatePath("/dashboard/trips");
}
