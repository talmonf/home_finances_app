import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import {
  ensureDefaultConsultationTypes,
  ensureDefaultExpenseCategories,
  ensureTherapySettings,
} from "@/lib/therapy/bootstrap";
import { redirect } from "next/navigation";
import {
  createTherapyConsultationType,
  createTherapyExpenseCategory,
  deleteTherapyConsultationType,
  deleteTherapyExpenseCategory,
  updateTherapyConsultationType,
  updateTherapyExpenseCategory,
  updateTherapyNoteLabelsFromDashboard,
} from "../actions";
import { privateClinicCommon, privateClinicSettings } from "@/lib/private-clinic-i18n";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { DashboardModal } from "@/components/dashboard-modal";

export const dynamic = "force-dynamic";

type Search = { saved?: string; error?: string; modal?: string };

export default async function PrivateClinicSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  await ensureTherapySettings(householdId);
  await ensureDefaultExpenseCategories(householdId);
  await ensureDefaultConsultationTypes(householdId);
  const uiLanguage = await getCurrentUiLanguage();
  const st = privateClinicSettings(uiLanguage);
  const c = privateClinicCommon(uiLanguage);
  const sp = searchParams ? await searchParams : {};
  const modalMode = sp.modal;

  const [settings, consultationTypes, expenseCategories] = await Promise.all([
    prisma.therapy_settings.findUnique({
      where: { household_id: householdId },
      select: {
        note_1_label: true,
        note_2_label: true,
        note_3_label: true,
        note_1_label_he: true,
        note_2_label_he: true,
        note_3_label_he: true,
      },
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_expense_categories.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
  ]);

  const flash =
    sp.error === "cat"
      ? ({ kind: "err" as const, text: st.errGeneric })
      : sp.error === "cat-in-use"
        ? ({ kind: "err" as const, text: st.errCatInUse })
        : sp.error === "ctype"
          ? ({ kind: "err" as const, text: st.errGeneric })
          : sp.error === "ctype-in-use"
            ? ({ kind: "err" as const, text: st.errCtypeInUse })
            : sp.saved === "1"
              ? ({ kind: "ok" as const, text: c.saved })
              : sp.saved === "cat"
                ? ({ kind: "ok" as const, text: st.savedExpenseCat })
                : sp.saved === "ctype"
                  ? ({ kind: "ok" as const, text: st.savedConsultType })
                  : null;

  return (
    <div className="space-y-6">
      {flash ? (
        <p
          className={
            flash.kind === "ok"
              ? "rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
              : "rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-sm text-rose-100"
          }
        >
          {flash.text}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:p-6">
        <h2 className="text-lg font-medium text-slate-200">{st.pageTitle}</h2>
        <p className="mt-2 text-sm text-slate-400">{st.pageIntro}</p>

        <h3 className="mt-6 text-sm font-semibold text-slate-200">{st.noteLabelsTitle}</h3>
        <p className="mt-1 text-xs text-slate-500">{st.noteLabelsHelp}</p>

        <form action={updateTherapyNoteLabelsFromDashboard} className="mt-4 space-y-6">
          {(
            [
              {
                n: 1 as const,
                enKey: "note_1_label",
                heKey: "note_1_label_he",
                enDefault: settings?.note_1_label ?? "Note 1",
                heDefault: settings?.note_1_label_he ?? "",
              },
              {
                n: 2 as const,
                enKey: "note_2_label",
                heKey: "note_2_label_he",
                enDefault: settings?.note_2_label ?? "Note 2",
                heDefault: settings?.note_2_label_he ?? "",
              },
              {
                n: 3 as const,
                enKey: "note_3_label",
                heKey: "note_3_label_he",
                enDefault: settings?.note_3_label ?? "Note 3",
                heDefault: settings?.note_3_label_he ?? "",
              },
            ] as const
          ).map((row) => (
            <div
              key={row.enKey}
              className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  {st.noteFieldEnglish(row.n)}
                </label>
                <input
                  name={row.enKey}
                  required
                  defaultValue={row.enDefault}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  {st.noteFieldHebrew(row.n)}
                </label>
                <input
                  name={row.heKey}
                  defaultValue={row.heDefault}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            {st.saveLabels}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:p-6">
        <h2 className="text-lg font-medium text-slate-200">{st.consultTypesTitle}</h2>
        <p className="mt-2 text-sm text-slate-400">{st.consultTypesHelp}</p>

        <ul className="mb-4 mt-4 space-y-2 text-sm">
          {consultationTypes.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
            >
              <form action={updateTherapyConsultationType} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={row.id} />
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{st.fieldEnglish}</label>
                  <input
                    name="name"
                    defaultValue={row.name}
                    required
                    className="w-48 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{st.fieldHebrew}</label>
                  <input
                    name="name_he"
                    defaultValue={row.name_he ?? ""}
                    className="w-48 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-600"
                >
                  {c.save}
                </button>
              </form>
              {row.is_system ? (
                <span className="text-xs text-slate-600">{st.defaultTag}</span>
              ) : (
                <ConfirmDeleteForm action={deleteTherapyConsultationType} className="inline">
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                    {st.remove}
                  </button>
                </ConfirmDeleteForm>
              )}
            </li>
          ))}
        </ul>
        <a
          href="/dashboard/private-clinic/settings?modal=consultation-type-new"
          className="inline-flex rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
        >
          {st.addConsultationTypeBtn}
        </a>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:p-6">
        <h2 className="text-lg font-medium text-slate-200">{st.expenseCatsTitle}</h2>
        <p className="mt-2 text-sm text-slate-400">{st.expenseCatsHelp}</p>

        <ul className="mb-4 mt-4 space-y-2 text-sm">
          {expenseCategories.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
            >
              <form action={updateTherapyExpenseCategory} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={row.id} />
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{st.fieldEnglish}</label>
                  <input
                    name="name"
                    defaultValue={row.name}
                    required
                    className="w-48 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{st.fieldHebrew}</label>
                  <input
                    name="name_he"
                    defaultValue={row.name_he ?? ""}
                    className="w-48 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-600"
                >
                  {c.save}
                </button>
              </form>
              {row.is_system ? (
                <span className="text-xs text-slate-600">{st.defaultTag}</span>
              ) : (
                <ConfirmDeleteForm action={deleteTherapyExpenseCategory} className="inline">
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                    {st.remove}
                  </button>
                </ConfirmDeleteForm>
              )}
            </li>
          ))}
        </ul>
        <a
          href="/dashboard/private-clinic/settings?modal=expense-category-new"
          className="inline-flex rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
        >
          {st.addExpenseCategoryBtn}
        </a>
      </section>
      {modalMode === "consultation-type-new" ? (
        <DashboardModal
          title={st.addConsultationTypeBtn}
          closeHref="/dashboard/private-clinic/settings"
          closeLabel={c.close}
          maxWidthClassName="max-w-xl"
        >
            <form action={createTherapyConsultationType} className="flex flex-wrap items-end gap-2">
              <input
                name="name"
                placeholder={st.newTypeName}
                required
                className="w-48 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <input
                name="name_he"
                placeholder={st.fieldHebrew}
                className="w-48 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
              >
                {st.addConsultationTypeBtn}
              </button>
            </form>
        </DashboardModal>
      ) : null}
      {modalMode === "expense-category-new" ? (
        <DashboardModal
          title={st.addExpenseCategoryBtn}
          closeHref="/dashboard/private-clinic/settings"
          closeLabel={c.close}
          maxWidthClassName="max-w-xl"
        >
            <form action={createTherapyExpenseCategory} className="flex flex-wrap items-end gap-2">
              <input
                name="name"
                placeholder={st.newCatName}
                required
                className="w-48 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <input
                name="name_he"
                placeholder={st.fieldHebrew}
                className="w-48 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
              >
                {st.addExpenseCategoryBtn}
              </button>
            </form>
        </DashboardModal>
      ) : null}
    </div>
  );
}
