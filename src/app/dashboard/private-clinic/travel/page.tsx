import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatClientNameForDisplay, formatMoneyLineForDisplay } from "@/lib/privacy-display";
import { formatHouseholdDate, formatHouseholdDateUtcWithTime } from "@/lib/household-date-format";
import { privateClinicCommon, privateClinicTravel } from "@/lib/private-clinic-i18n";
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

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const tv = privateClinicTravel(uiLanguage);
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
      <p className="text-sm text-slate-500">{tv.intro}</p>
      {sp?.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {sp.error}
        </p>
      )}
      {(sp?.created || sp?.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {c.saved}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{tv.addTravel}</h2>
        <form
          action={createTherapyTravelEntry}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-slate-300">
            <label className="flex items-center gap-2">
              <input type="radio" name="link_scope" value="job" defaultChecked />
              {tv.relatedJob}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="link_scope" value="treatment" />
              {tv.relatedTreatment}
            </label>
          </div>
          <select
            name="job_id"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{tv.jobWhenScope}</option>
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
            <option value="">{tv.treatmentWhenScope}</option>
            {treatments.map((t) => (
              <option key={t.id} value={t.id}>
                {formatHouseholdDate(t.occurred_at, dateDisplayFormat)} —{" "}
                {formatClientNameForDisplay(obfuscate, t.client.first_name, t.client.last_name)} — {t.job.job_title}
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
              placeholder={tv.costAmountOptional}
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
              label={tv.linkTravelTx}
              hint={tv.linkTravelHint}
              noneOptionLabel={c.txNoneLinked}
            />
          </div>
          <textarea
            name="notes"
            placeholder={tv.notesRoute}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {c.save}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{tv.entries}</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">{c.travelEmpty}</p>
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
                      ? formatHouseholdDateUtcWithTime(e.occurred_at, dateDisplayFormat)
                      : c.noDate}{" "}
                    —{" "}
                    {e.treatment
                      ? `${tv.scopeTreatment} ${formatClientNameForDisplay(obfuscate, e.treatment.client.first_name, e.treatment.client.last_name)} (${e.treatment.job.job_title})`
                      : e.job
                        ? `${tv.scopeJob} ${e.job.job_title}`
                        : "—"}
                    {e.amount != null
                      ? ` — ${formatMoneyLineForDisplay(obfuscate, e.amount.toString(), e.currency)}`
                      : ""}
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
                        {c.job}
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="link_scope"
                          value="treatment"
                          defaultChecked={scope === "treatment"}
                        />
                        {c.treatment}
                      </label>
                    </div>
                    <select
                      name="job_id"
                      defaultValue={e.job_id ?? ""}
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    >
                      <option value="">{c.job}</option>
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
                      <option value="">{c.treatment}</option>
                      {treatments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {formatHouseholdDate(t.occurred_at, dateDisplayFormat)} —{" "}
                          {formatClientNameForDisplay(obfuscate, t.client.first_name, t.client.last_name)}
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
                        label={tv.linkedTx}
                        noneOptionLabel={c.txNoneLinked}
                      />
                    </div>
                    <textarea
                      name="notes"
                      defaultValue={e.notes ?? ""}
                      className="md:col-span-2 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                    <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white">
                      {c.save}
                    </button>
                  </form>
                  <ConfirmDeleteForm action={deleteTherapyTravelEntry} className="mt-2">
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className="text-xs text-rose-400">
                      {c.delete}
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
