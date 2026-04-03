import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createTherapyTreatment, deleteTherapyTreatment, updateTherapyTreatment } from "../actions";
import { decimalToNumber, treatmentPaymentStatus } from "@/lib/therapy/payment";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";

export const dynamic = "force-dynamic";

type Search = {
  paid?: string;
  job?: string;
  program?: string;
  from?: string;
  to?: string;
};

export default async function TreatmentsPage({
  searchParams,
}: {
  searchParams?: Promise<Search & { created?: string; updated?: string; error?: string }>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const sp = searchParams ? await searchParams : {};
  const paidFilter = sp.paid || "all";
  const jobFilter = sp.job || "";
  const programFilter = sp.program || "";
  const from = sp.from ? new Date(sp.from) : null;
  const to = sp.to ? new Date(sp.to) : null;

  const [jobs, programs, clients, settings, allocGroups, treatments] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_service_programs.findMany({
      where: { household_id: householdId },
      include: { job: true },
    }),
    prisma.therapy_clients.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { first_name: "asc" },
    }),
    prisma.therapy_settings.findUnique({ where: { household_id: householdId } }),
    prisma.therapy_receipt_allocations.groupBy({
      by: ["treatment_id"],
      where: { household_id: householdId },
      _sum: { amount: true },
    }),
    prisma.therapy_treatments.findMany({
      where: {
        household_id: householdId,
        ...(jobFilter ? { job_id: jobFilter } : {}),
        ...(programFilter ? { program_id: programFilter } : {}),
        ...(from || to
          ? {
              occurred_at: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurred_at: "desc" },
      include: { client: true, job: true, program: true },
      take: 500,
    }),
  ]);

  const sumMap = new Map(
    allocGroups.map((g) => [g.treatment_id, decimalToNumber(g._sum.amount)]),
  );

  const filtered = treatments.filter((t) => {
    const allocated = sumMap.get(t.id) ?? 0;
    const st = treatmentPaymentStatus(t.amount, allocated);
    if (paidFilter === "all") return true;
    if (paidFilter === "paid") return st === "paid";
    if (paidFilter === "unpaid") return st === "unpaid";
    if (paidFilter === "partial") return st === "partial";
    return true;
  });

  const note1 = settings?.note_1_label ?? "Note 1";
  const note2 = settings?.note_2_label ?? "Note 2";
  const note3 = settings?.note_3_label ?? "Note 3";

  const visitOptions = ["clinic", "home", "phone", "video"] as const;

  return (
    <div className="space-y-8">
      {sp.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {sp.error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Filters</h2>
        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          method="get"
        >
          <div>
            <label className="block text-xs text-slate-400">Payment</label>
            <select
              name="paid"
              defaultValue={paidFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Job</label>
            <select
              name="job"
              defaultValue={jobFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Any</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.job_title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Program</label>
            <select
              name="program"
              defaultValue={programFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Any</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.job.job_title} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">From</label>
            <input
              name="from"
              type="date"
              defaultValue={sp.from ?? ""}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">To</label>
            <input
              name="to"
              type="date"
              defaultValue={sp.to ?? ""}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
          >
            Apply
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Log treatment</h2>
        <form
          action={createTherapyTreatment}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <div>
            <label className="block text-xs text-slate-400">Client</label>
            <select
              name="client_id"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Select</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name ?? ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Job</label>
            <select
              name="job_id"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.job_title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Program</label>
            <select
              name="program_id"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.job.job_title} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Date & time</label>
            <input
              name="occurred_at"
              type="datetime-local"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">Amount</label>
            <input
              name="amount"
              type="text"
              required
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">Currency</label>
            <input
              name="currency"
              defaultValue="ILS"
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">Visit type</label>
            <select
              name="visit_type"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {visitOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">Link bank transaction (optional)</label>
            <TherapyTransactionLinkSelect
              name="linked_transaction_id"
              householdId={householdId}
              label="Link bank transaction — clinic income"
              hint="Optional: link a credit/incoming payment that matches this session fee."
            />
          </div>
          <textarea
            name="note_1"
            placeholder={note1}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <textarea
            name="note_2"
            placeholder={note2}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <textarea
            name="note_3"
            placeholder={note3}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Save treatment
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Treatments ({filtered.length})</h2>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No rows match.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-3 py-2 text-slate-300">When</th>
                  <th className="px-3 py-2 text-slate-300">Client</th>
                  <th className="px-3 py-2 text-slate-300">Job</th>
                  <th className="px-3 py-2 text-slate-300">Amount</th>
                  <th className="px-3 py-2 text-slate-300">Paid</th>
                  <th className="px-3 py-2 text-slate-300">Edit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const allocated = sumMap.get(t.id) ?? 0;
                  const st = treatmentPaymentStatus(t.amount, allocated);
                  return (
                    <tr key={t.id} className="border-b border-slate-700/80">
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                        {t.occurred_at.toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="px-3 py-2 text-slate-100">
                        {t.client.first_name} {t.client.last_name ?? ""}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{t.job.job_title}</td>
                      <td className="px-3 py-2 text-slate-200">
                        {t.amount.toString()} {t.currency}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{st}</td>
                      <td className="px-3 py-2 align-top">
                        <details>
                          <summary className="cursor-pointer text-xs text-sky-400">Edit</summary>
                          <form action={updateTherapyTreatment} className="mt-2 space-y-2 rounded border border-slate-700 p-2">
                            <input type="hidden" name="id" value={t.id} />
                            <select
                              name="job_id"
                              defaultValue={t.job_id}
                              required
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            >
                              {jobs.map((j) => (
                                <option key={j.id} value={j.id}>
                                  {j.job_title}
                                </option>
                              ))}
                            </select>
                            <select
                              name="program_id"
                              defaultValue={t.program_id}
                              required
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            >
                              {programs.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.job.job_title} — {p.name}
                                </option>
                              ))}
                            </select>
                            <input
                              name="occurred_at"
                              type="datetime-local"
                              defaultValue={t.occurred_at.toISOString().slice(0, 16)}
                              required
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            />
                            <input
                              name="amount"
                              defaultValue={t.amount.toString()}
                              required
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            />
                            <input name="currency" defaultValue={t.currency} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs" />
                            <select name="visit_type" defaultValue={t.visit_type} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs">
                              {visitOptions.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                            <TherapyTransactionLinkSelect
                              name="linked_transaction_id"
                              householdId={householdId}
                              currentId={t.linked_transaction_id}
                              label="Clinic income (optional)"
                            />
                            <textarea name="note_1" defaultValue={t.note_1 ?? ""} placeholder={note1} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs" />
                            <textarea name="note_2" defaultValue={t.note_2 ?? ""} placeholder={note2} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs" />
                            <textarea name="note_3" defaultValue={t.note_3 ?? ""} placeholder={note3} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs" />
                            <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white">
                              Save
                            </button>
                          </form>
                          <ConfirmDeleteForm action={deleteTherapyTreatment} className="mt-2">
                            <input type="hidden" name="id" value={t.id} />
                            <button type="submit" className="text-xs text-rose-400">
                              Delete
                            </button>
                          </ConfirmDeleteForm>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
