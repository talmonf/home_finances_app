import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { ensureTherapySettings } from "@/lib/therapy/bootstrap";
import { redirect } from "next/navigation";
import { updateTherapyNoteLabelsFromDashboard } from "../actions";
import { privateClinicCommon, privateClinicSettings } from "@/lib/private-clinic-i18n";

export const dynamic = "force-dynamic";

type Search = { saved?: string };

export default async function PrivateClinicSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  await ensureTherapySettings(householdId);
  const uiLanguage = await getCurrentUiLanguage();
  const st = privateClinicSettings(uiLanguage);
  const c = privateClinicCommon(uiLanguage);
  const sp = searchParams ? await searchParams : {};

  const settings = await prisma.therapy_settings.findUnique({
    where: { household_id: householdId },
    select: {
      note_1_label: true,
      note_2_label: true,
      note_3_label: true,
      note_1_label_he: true,
      note_2_label_he: true,
      note_3_label_he: true,
    },
  });

  return (
    <div className="space-y-6">
      {sp.saved ? (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {c.saved}
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
    </div>
  );
}
