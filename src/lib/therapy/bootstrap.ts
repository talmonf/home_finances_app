import { prisma } from "@/lib/auth";

const DEFAULT_CONSULTATION_TYPE_NAMES = [
  "Initial consultation",
  "Follow-up",
  "Supervision / case discussion",
  "Administrative meeting",
  "Other",
];

const DEFAULT_EXPENSE_CATEGORY_NAMES = [
  "Office & clinic rent",
  "Supplies",
  "Professional development",
  "Insurance",
  "Utilities",
  "Marketing",
  "Other",
];

export async function ensureTherapySettings(householdId: string) {
  const existing = await prisma.therapy_settings.findUnique({
    where: { household_id: householdId },
  });
  if (existing) return existing;
  return prisma.therapy_settings.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
    },
  });
}

export async function ensureDefaultConsultationTypes(householdId: string) {
  const count = await prisma.therapy_consultation_types.count({
    where: { household_id: householdId },
  });
  if (count > 0) return;

  await prisma.$transaction(
    DEFAULT_CONSULTATION_TYPE_NAMES.map((name, sort_order) =>
      prisma.therapy_consultation_types.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          name,
          sort_order,
          is_system: true,
        },
      }),
    ),
  );
}

export async function ensureDefaultExpenseCategories(householdId: string) {
  const count = await prisma.therapy_expense_categories.count({
    where: { household_id: householdId },
  });
  if (count > 0) return;

  await prisma.$transaction(
    DEFAULT_EXPENSE_CATEGORY_NAMES.map((name, sort_order) =>
      prisma.therapy_expense_categories.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          name,
          sort_order,
          is_system: true,
        },
      }),
    ),
  );
}
