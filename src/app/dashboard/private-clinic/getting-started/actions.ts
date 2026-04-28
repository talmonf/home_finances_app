"use server";

import { prisma, getAuthSession, requireHouseholdMember } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function completePrivateClinicGettingStartedAction() {
  const session = await getAuthSession();
  if (!session?.user?.id || session.user.isSuperAdmin) {
    redirect("/dashboard/private-clinic");
  }
  await requireHouseholdMember();
  await prisma.users.update({
    where: { id: session.user.id },
    data: { private_clinic_getting_started_completed_at: new Date() },
  });
  redirect("/dashboard/private-clinic");
}
