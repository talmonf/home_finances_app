/**
 * Interactive transaction client from prisma.$transaction(async (tx) => …).
 * Typed loosely so this module does not depend on generated PrismaClient generics.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Many legacy FKs use REFERENCES households(id) without ON DELETE CASCADE, so a plain
 * households.delete fails (P2003). Remove non–private-clinic rows in dependency-safe order
 * after therapy/clinic rows are already cleared.
 *
 * **Durable fix:** run migration `113_household_id_on_delete_cascade.sql` so Postgres cascades
 * `household_id` deletes; this routine remains as a safety net for older DBs and edge cases.
 */
export async function deleteCoreHouseholdScopedRowsInTransaction(tx: Tx, householdId: string): Promise<void> {
  if (!UUID_RE.test(householdId)) {
    throw new Error("Invalid household id");
  }

  await tx.user_enabled_sections.deleteMany({
    where: { user: { household_id: householdId } },
  });

  await tx.general_audit_events.deleteMany({ where: { household_id: householdId } });
  await tx.private_clinic_backup_snapshots.deleteMany({ where: { household_id: householdId } });

  await tx.renewal_email_subscriptions.deleteMany({ where: { household_id: householdId } });

  await tx.tasks.deleteMany({ where: { household_id: householdId } });

  await tx.transactions.deleteMany({ where: { household_id: householdId } });
  await tx.documents.deleteMany({ where: { household_id: householdId } });

  for (let i = 0; i < 64; i++) {
    const { count } = await tx.categories.deleteMany({
      where: {
        household_id: householdId,
        children: { none: {} },
      },
    });
    if (count === 0) break;
  }

  await tx.studies_and_classes.deleteMany({ where: { household_id: householdId } });
  await tx.subscriptions.deleteMany({ where: { household_id: householdId } });

  await tx.property_utilities.deleteMany({ where: { household_id: householdId } });

  await tx.payees.deleteMany({ where: { household_id: householdId } });

  await tx.trips.deleteMany({ where: { household_id: householdId } });

  await tx.car_petrol_fillups.deleteMany({ where: { household_id: householdId } });
  await tx.car_services.deleteMany({ where: { household_id: householdId } });
  await tx.car_licenses.deleteMany({ where: { household_id: householdId } });
  await tx.cars.deleteMany({ where: { household_id: householdId } });

  await tx.rental_contracts.deleteMany({ where: { household_id: householdId } });
  await tx.rentals.deleteMany({ where: { household_id: householdId } });

  await tx.donations.deleteMany({ where: { household_id: householdId } });
  await tx.significant_purchases.deleteMany({ where: { household_id: householdId } });
  await tx.medical_appointments.deleteMany({ where: { household_id: householdId } });
  await tx.digital_payment_methods.deleteMany({ where: { household_id: householdId } });
  await tx.identities.deleteMany({ where: { household_id: householdId } });

  await tx.insurance_policies.deleteMany({ where: { household_id: householdId } });
  await tx.savings_policies.deleteMany({ where: { household_id: householdId } });

  await tx.entity_urls.deleteMany({ where: { household_id: householdId } });
  await tx.useful_links.deleteMany({
    where: {
      OR: [{ household_id: householdId }, { user: { household_id: householdId } }],
    },
  });

  await tx.job_benefits.deleteMany({ where: { household_id: householdId } });
  await tx.job_documents.deleteMany({ where: { household_id: householdId } });
  await tx.job_payroll_entries.deleteMany({ where: { household_id: householdId } });

  await tx.jobs.deleteMany({ where: { household_id: householdId } });

  await tx.loans.deleteMany({ where: { household_id: householdId } });

  await tx.users.deleteMany({ where: { household_id: householdId } });
  await tx.family_members.deleteMany({ where: { household_id: householdId } });

  await tx.bank_accounts.deleteMany({ where: { household_id: householdId } });
  await tx.credit_cards.deleteMany({ where: { household_id: householdId } });
  await tx.properties.deleteMany({ where: { household_id: householdId } });

  await tx.household_enabled_sections.deleteMany({ where: { household_id: householdId } });
  await tx.household_section_statuses.deleteMany({ where: { household_id: householdId } });
}
