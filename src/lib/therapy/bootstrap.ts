import { prisma } from "@/lib/auth";

const DEFAULT_CONSULTATION_TYPES: { name: string; name_he: string }[] = [
  { name: "Initial consultation", name_he: "פגישה ראשונית" },
  { name: "Follow-up", name_he: "מעקב" },
  { name: "Supervision / case discussion", name_he: "הדרכה / דיון מקרה" },
  { name: "Administrative meeting", name_he: "פגישה מנהלית" },
  { name: "Other", name_he: "אחר" },
];

const DEFAULT_EXPENSE_CATEGORIES: { name: string; name_he: string }[] = [
  { name: "Office & clinic rent", name_he: "שכירות מרפאה" },
  { name: "Supplies", name_he: "ציוד" },
  { name: "Professional development", name_he: "השתלמות מקצועית" },
  { name: "Insurance", name_he: "ביטוח" },
  { name: "Utilities", name_he: "חשבונות משק בית" },
  { name: "Marketing", name_he: "שיווק" },
  { name: "Other", name_he: "אחר" },
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
    DEFAULT_CONSULTATION_TYPES.map((row, sort_order) =>
      prisma.therapy_consultation_types.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          name: row.name,
          name_he: row.name_he,
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
    DEFAULT_EXPENSE_CATEGORIES.map((row, sort_order) =>
      prisma.therapy_expense_categories.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          name: row.name,
          name_he: row.name_he,
          sort_order,
          is_system: true,
        },
      }),
    ),
  );
}
