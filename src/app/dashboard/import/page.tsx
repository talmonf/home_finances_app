import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ImportUploadForm } from "./ImportUploadForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const [documents, bankAccounts] = await Promise.all([
    prisma.documents.findMany({
      where: { household_id: householdId },
      orderBy: { created_at: "desc" },
      take: 20,
      include: {
        _count: { select: { transactions: true } },
        bank_account: true,
      },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { account_name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header>
          <Link
            href="/"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">
            Import bank statements
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Upload a PDF or Excel bank statement. Transactions will be extracted for review.
            Then choose <strong>Review</strong> to edit categories and details, or <strong>Assisted</strong> for AI help.
          </p>
        </header>

        <ImportUploadForm bankAccounts={bankAccounts} uiLanguage={uiLanguage} />

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "יבואים אחרונים" : "Recent imports"}</h2>
          {documents.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {isHebrew ? "אין יבואים עדיין. ניתן להעלות קובץ למעלה." : "No imports yet. Upload a file above."}
            </p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-slate-200">{doc.file_name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {doc._count.transactions} transactions
                      {doc.bank_account ? ` · ${doc.bank_account.account_name}` : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/import/review/${doc.id}`}
                      className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
                    >
                      {isHebrew ? "סקירה" : "Review"}
                    </Link>
                    <Link
                      href={`/dashboard/import/assist/${doc.id}`}
                      className="rounded bg-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-500"
                    >
                      {isHebrew ? "מונחה" : "Assisted"}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
