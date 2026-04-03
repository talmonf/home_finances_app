import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  createTherapyConsultationType,
  createTherapyExpenseCategory,
  deleteTherapyConsultationType,
  updateTherapySettings,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function TherapySettingsPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const [settings, categories, consultationTypes] = await Promise.all([
    prisma.therapy_settings.findUnique({ where: { household_id: householdId } }),
    prisma.therapy_expense_categories.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Treatment note labels</h2>
        <p className="text-sm text-slate-500">
          These titles appear next to the three note fields when logging treatments.
        </p>
        <form
          action={updateTherapySettings}
          className="grid max-w-xl gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
        >
          <input
            name="note_1_label"
            defaultValue={settings?.note_1_label ?? "Note 1"}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="note_2_label"
            defaultValue={settings?.note_2_label ?? "Note 2"}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="note_3_label"
            defaultValue={settings?.note_3_label ?? "Note 3"}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Save labels
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Consultation / meeting types</h2>
        <p className="text-sm text-slate-500">
          Used when logging meetings on the Consultations page (separate from visit types on sessions).
        </p>
        <ul className="space-y-1 text-sm text-slate-400">
          {consultationTypes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2">
              <span>{c.name}</span>
              {c.is_system ? (
                <span className="text-xs text-slate-600">(default)</span>
              ) : (
                <ConfirmDeleteForm action={deleteTherapyConsultationType} className="inline">
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                    Remove
                  </button>
                </ConfirmDeleteForm>
              )}
            </li>
          ))}
        </ul>
        <form
          action={createTherapyConsultationType}
          className="flex max-w-md flex-wrap items-end gap-2"
        >
          <input
            name="name"
            placeholder="New type name"
            required
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
          >
            Add
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Expense categories</h2>
        <ul className="space-y-1 text-sm text-slate-400">
          {categories.map((c) => (
            <li key={c.id}>
              {c.name}
              {c.is_system ? (
                <span className="ml-2 text-xs text-slate-600">(default)</span>
              ) : null}
            </li>
          ))}
        </ul>
        <form
          action={createTherapyExpenseCategory}
          className="flex max-w-md flex-wrap items-end gap-2"
        >
          <input
            name="name"
            placeholder="New category name"
            required
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
          >
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
