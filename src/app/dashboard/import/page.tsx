import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ImportUploadForm } from "./ImportUploadForm";
import { RiseUpImportFlow } from "./RiseUpImportFlow";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ format?: string }>;
};

export default async function ImportPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const sp = searchParams ? await searchParams : undefined;
  const format = sp?.format === "riseup" ? "riseup" : "bank";

  const [documents, bankAccounts, creditCards] = await Promise.all([
    format === "riseup"
      ? Promise.resolve([])
      : prisma.documents.findMany({
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
    prisma.credit_cards.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { card_name: "asc" },
    }),
  ]);

  const bankAccountOptions = bankAccounts.map((a) => ({
    id: a.id,
    label: `${a.bank_name} · ${a.account_name}${a.account_number ? ` (${a.account_number})` : ""}`,
  }));
  const creditCardOptions = creditCards.map((c) => ({
    id: c.id,
    label: `${c.issuer_name} · ${c.card_name} · ${c.card_last_four}`,
  }));

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div
        className={`w-full space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700 ${
          format === "riseup" ? "max-w-[96rem]" : "max-w-5xl"
        }`}
      >
        <header>
          <Link
            href="/"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">
            {isHebrew ? "ייבוא דפי חשבון" : "Import bank statements"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {format === "riseup"
              ? isHebrew
                ? "ייבוא CSV מ-RiseUp: ניתוח, התאמה לישויות הקיימות, ואישור לפני שמירה."
                : "RiseUp CSV: analyze, match to existing entities, then confirm before saving."
              : isHebrew
                ? "העלאת PDF או Excel. התנועות יחולצו לסקירה — סקירה או מונחה."
                : "Upload PDF or Excel. Transactions are extracted for review — Review or Assisted."}
          </p>
        </header>

        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-2">
          <Link
            href="/dashboard/import"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              format === "bank"
                ? "bg-sky-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {isHebrew ? "בנק PDF / Excel" : "Bank PDF / Excel"}
          </Link>
          <Link
            href="/dashboard/import?format=riseup"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              format === "riseup"
                ? "bg-violet-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {isHebrew ? "RiseUp (CSV)" : "RiseUp (CSV)"}
          </Link>
        </div>

        {format === "riseup" ? (
          <RiseUpImportFlow
            uiLanguage={uiLanguage}
            bankAccounts={bankAccountOptions}
            creditCards={creditCardOptions}
          />
        ) : (
          <ImportUploadForm bankAccounts={bankAccounts} uiLanguage={uiLanguage} />
        )}

        {format !== "riseup" ? (
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
        ) : null}
      </div>
    </div>
  );
}
