import { TherapyImportForm } from "@/components/therapy-import-form";

export const dynamic = "force-dynamic";

export default function ImportExportPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Export</h2>
        <p className="text-sm text-slate-500">
          Download one Excel workbook with multiple sheets (jobs, programs, clients, treatments,
          receipts, expenses, etc.).
        </p>
        <a
          href="/api/private-clinic/export"
          className="inline-flex rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          Download .xlsx
        </a>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Import</h2>
        <p className="text-sm text-slate-500">
          Upload an Excel file in the same shape as the export (sheet names include Programs,
          Clients, Treatments, Receipts, ConsultationTypes, Consultations, Travel, Expenses, etc.).
          Existing rows are upserted when <code className="text-slate-400">id</code> is present.
        </p>
        <TherapyImportForm />
      </section>
    </div>
  );
}
