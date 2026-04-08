import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  createTherapyConsultationType,
  createTherapyExpenseCategory,
  deleteTherapyExpenseCategory,
  deleteTherapyConsultationType,
  updateTherapyConsultationType,
  updateTherapyExpenseCategory,
  updateTherapyNavTabs,
  updateTherapySettings,
} from "../actions";
import { mergePrivateClinicNavVisibility, PRIVATE_CLINIC_NAV_ITEMS } from "@/lib/private-clinic-nav";

export const dynamic = "force-dynamic";

export default async function TherapySettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ updated?: string; error?: string }>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const sp = searchParams ? await searchParams : undefined;

  const [settings, categories, consultationTypes] = await Promise.all([
    prisma.therapy_settings.findUnique({
      where: { household_id: householdId },
      select: {
        note_1_label: true,
        note_2_label: true,
        note_3_label: true,
        nav_tabs_json: true,
      },
    }),
    prisma.therapy_expense_categories.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
  ]);

  const navVisibility = mergePrivateClinicNavVisibility(settings?.nav_tabs_json);

  return (
    <div className="space-y-8">
      {sp?.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {sp.error === "ctype-in-use"
            ? "Cannot delete consultation type because it is already used by one or more consultations."
            : sp.error === "cat-in-use"
              ? "Cannot delete expense category because it is already used by one or more expenses."
              : "Could not complete the action."}
        </p>
      )}
      {sp?.updated && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {sp.updated === "nav" ? "Tab visibility saved." : "Saved."}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Private clinic tabs</h2>
        <p className="text-sm text-slate-500">
          Choose which sections appear in the Private clinic navigation. You can still open a hidden tab if you know
          the URL.
        </p>
        <form
          action={updateTherapyNavTabs}
          className="max-w-xl space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
        >
          <ul className="space-y-2">
            {PRIVATE_CLINIC_NAV_ITEMS.map((item) => (
                <li key={item.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`nav_${item.key}`}
                    name={`nav_${item.key}`}
                    defaultChecked={navVisibility[item.key]}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                  />
                  <label htmlFor={`nav_${item.key}`} className="text-sm text-slate-200">
                    {item.label}
                  </label>
                </li>
            ))}
          </ul>
          <button
            type="submit"
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Save tab visibility
          </button>
        </form>
      </section>

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
              <form action={updateTherapyConsultationType} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="name"
                  defaultValue={c.name}
                  className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                />
                <button type="submit" className="text-xs text-sky-400 hover:text-sky-300">
                  Save
                </button>
              </form>
              {c.is_system ? <span className="text-xs text-slate-600">(default)</span> : null}
              {!c.is_system && (
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
            <li key={c.id} className="flex flex-wrap items-center gap-2">
              <form action={updateTherapyExpenseCategory} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="name"
                  defaultValue={c.name}
                  className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                />
                <button type="submit" className="text-xs text-sky-400 hover:text-sky-300">
                  Save
                </button>
              </form>
              {c.is_system ? <span className="text-xs text-slate-600">(default)</span> : null}
              {!c.is_system && (
                <ConfirmDeleteForm action={deleteTherapyExpenseCategory} className="inline">
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
