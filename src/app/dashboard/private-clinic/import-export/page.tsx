import { TherapyImportForm } from "@/components/therapy-import-form";
import { getCurrentHouseholdId, getCurrentUiLanguage, requireHouseholdMember } from "@/lib/auth";
import { privateClinicImportExport } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ImportExportPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const ie = privateClinicImportExport(uiLanguage);
  const locale = uiLanguage === "he" ? "he" : "en";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{ie.exportTitle}</h2>
        <p className="text-sm text-slate-500">{ie.exportHelp}</p>
        <a
          href="/api/private-clinic/export"
          className="inline-flex rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          {ie.downloadXlsx}
        </a>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{ie.importTitle}</h2>
        <p className="text-sm text-slate-500">{ie.importHelp}</p>
        <TherapyImportForm
          locale={locale}
          labels={{
            importWorkbook: ie.importWorkbook,
            importFailed: ie.importFailed,
          }}
        />
      </section>
    </div>
  );
}
