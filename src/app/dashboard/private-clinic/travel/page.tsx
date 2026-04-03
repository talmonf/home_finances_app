import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  createTherapyTravelEntry,
  deleteTherapyTravelEntry,
  updateTherapyTravelEntry,
} from "../actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";

export const dynamic = "force-dynamic";

export default async function TravelPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const sp = searchParams ? await searchParams : undefined;

  const [jobs, treatments, entries] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId },
      orderBy: { occurred_at: "desc" },
      take: 300,
      include: { client: true, job: true },
    }),
    prisma.therapy_travel_entries.findMany({
      where: { household_id: householdId },
      orderBy: { created_at: "desc" },
      take: 200,
      include: { job: true, treatment: { include: { client: true, job: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-500">
        Record travel tied to a specific session or to a job in general. Optionally link a bank
        transaction (typically a debit) for reimbursement or mileage costs.
      </p>
      {sp?.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {sp.error}
        </p>
      )}
      {(sp?.created || sp?.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          Saved.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Add travel</h2>
        <form
          action={createTherapyTravelEntry}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-slate-300">
            <label className="flex items-center gap-2">
              <input type="radio" name="link_scope" value="job" defaultChecked />
              Related to a job
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="link_scope" value="treatment" />
              Related to a treatment session
            </label>
          </div>
          <select
            name="job_id"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Job (when “related to a job”)</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_title}
              </option>
            ))}
          </select>
          <select
            name="treatment_id"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Treatment (when “related to a treatment”)</option>
            {treatments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.occurred_at.toISOString().slice(0, 10)} — {t.client.first_name} — {t.job.job_title}
              </option>
            ))}
          </select>
          <input
            name="occurred_at"
            type="datetime-local"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="flex gap-2">
            <input
              name="amount"
              placeholder="Cost amount (optional)"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <input
              name="currency"
              defaultValue="ILS"
              className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="md:col-span-2">
            <TherapyTransactionLinkSelect
              name="linked_transaction_id"
              householdId={householdId}
              label="Link transaction — travel cost / reimbursement"
              hint="Usually a debit or a transfer that paid for this travel."
            />
          </div>
          <textarea
            name="notes"
            placeholder="Notes (route, mileage, parking…)"
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Save
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Entries</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">No travel entries yet.</p>
        ) : (
          <div className="space-y-4">
            {entries.map((e) => {
              const scope = e.treatment_id ? "treatment" : "job";
              return (
                <details
                  key={e.id}
                  className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
                >
                  <summary className="cursor-pointer text-sm text-slate-200">
                    {e.occurred_at
                      ? e.occurred_at.toISOString().slice(0, 16).replace("T", " ")
                      : "No date"}{" "}
                    —{" "}
                    {e.treatment
                      ? `Treatment: ${e.treatment.client.first_name} (${e.treatment.job.job_title})`
                      : e.job
                        ? `Job: ${e.job.job_title}`
                        : "—"}
                    {e.amount != null ? ` — ${e.amount.toString()} ${e.currency}` : ""}
                  </summary>
                  <form action={updateTherapyTravelEntry} className="mt-3 grid gap-2 md:grid-cols-2">
                    <input type="hidden" name="id" value={e.id} />
                    <div className="md:col-span-2 flex flex-wrap gap-4 text-xs text-slate-400">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="link_scope"
                          value="job"
                          defaultChecked={scope === "job"}
                        />
                        Job
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="link_scope"
                          value="treatment"
                          defaultChecked={scope === "treatment"}
                        />
                        Treatment
                      </label>
                    </div>
                    <select
                      name="job_id"
                      defaultValue={e.job_id ?? ""}
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    >
                      <option value="">Job</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.job_title}
                        </option>
                      ))}
                    </select>
                    <select
                      name="treatment_id"
                      defaultValue={e.treatment_id ?? ""}
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    >
                      <option value="">Treatment</option>
                      {treatments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.occurred_at.toISOString().slice(0, 10)} — {t.client.first_name}
                        </option>
                      ))}
                    </select>
                    <input
                      name="occurred_at"
                      type="datetime-local"
                      defaultValue={
                        e.occurred_at ? e.occurred_at.toISOString().slice(0, 16) : ""
                      }
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                    <div className="flex gap-1">
                      <input
                        name="amount"
                        defaultValue={e.amount?.toString() ?? ""}
                        className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                      />
                      <input
                        name="currency"
                        defaultValue={e.currency}
                        className="w-14 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <TherapyTransactionLinkSelect
                        name="linked_transaction_id"
                        householdId={householdId}
                        currentId={e.linked_transaction_id}
                        label="Linked transaction"
                      />
                    </div>
                    <textarea
                      name="notes"
                      defaultValue={e.notes ?? ""}
                      className="md:col-span-2 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                    <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white">
                      Save
                    </button>
                  </form>
                  <ConfirmDeleteForm action={deleteTherapyTravelEntry} className="mt-2">
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className="text-xs text-rose-400">
                      Delete
                    </button>
                  </ConfirmDeleteForm>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
