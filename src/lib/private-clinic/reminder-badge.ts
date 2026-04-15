import type { PrismaClient } from "@/generated/prisma/client";
import { CLINIC_INSURANCE_POLICY_TYPES } from "@/lib/private-clinic/constants";
import { countUpcomingReminders, startOfTodayLocal } from "@/lib/private-clinic/reminders-logic";
import { jobWhereInPrivateClinicModule } from "@/lib/private-clinic/jobs-scope";

export async function getPrivateClinicReminderBadgeCount(
  prisma: PrismaClient,
  householdId: string,
): Promise<number> {
  const today = startOfTodayLocal();

  const [manualRows, subscriptions, clients, clinicInsurance, clinicRentals] = await Promise.all([
    prisma.private_clinic_reminders.findMany({
      where: { household_id: householdId },
      select: { id: true, reminder_date: true, category: true, description: true },
    }),
    prisma.subscriptions.findMany({
      where: {
        household_id: householdId,
        job_id: { not: null },
        job: jobWhereInPrivateClinicModule,
      },
      select: {
        id: true,
        name: true,
        billing_interval: true,
        monthly_day_of_month: true,
        renewal_date: true,
        is_active: true,
        cancelled_at: true,
        job_id: true,
      },
    }),
    prisma.therapy_clients.findMany({
      where: { household_id: householdId },
      select: {
        id: true,
        is_active: true,
        end_date: true,
        first_name: true,
        last_name: true,
      },
    }),
    prisma.insurance_policies.findMany({
      where: { household_id: householdId, policy_type: { in: [...CLINIC_INSURANCE_POLICY_TYPES] } },
      select: {
        id: true,
        policy_type: true,
        is_active: true,
        expiration_date: true,
        provider_name: true,
        policy_name: true,
      },
    }),
    prisma.rentals.findMany({
      where: { household_id: householdId, is_clinic_lease: true },
      select: { id: true, is_clinic_lease: true, end_date: true, property_id: true },
    }),
  ]);

  return countUpcomingReminders({
    today,
    manual: manualRows,
    subscriptions,
    clients,
    clinicInsurance,
    clinicRentals,
  });
}
