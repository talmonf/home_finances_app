import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AssistChat } from "./AssistChat";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function ImportAssistPage({ params }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { documentId } = await params;

  const [doc, transactions] = await Promise.all([
    prisma.documents.findFirst({
      where: { id: documentId, household_id: householdId },
      include: { bank_account: true },
    }),
    prisma.transactions.findMany({
      where: { document_id: documentId, household_id: householdId },
      orderBy: { transaction_date: "asc" },
      take: 200,
    }),
  ]);

  if (!doc) notFound();

  const summary = transactions.map((t) => ({
    id: t.id,
    date: t.transaction_date.toISOString().slice(0, 10),
    amount: Number(t.amount),
    direction: t.transaction_direction,
    description: t.description ?? "",
  }));

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-4xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header>
          <Link
            href="/dashboard/import"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to import
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Assisted import</h1>
          <p className="mt-1 text-sm text-slate-400">
            {doc.file_name}
            {doc.bank_account ? ` · ${doc.bank_account.account_name}` : ""}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            The system will process the {transactions.length} transaction(s) and ask you questions to fill categories,
            payees, and other fields. Your answers will update the transactions.
          </p>
        </header>

        <AssistChat documentId={documentId} initialTransactions={summary} />
      </div>
    </div>
  );
}
