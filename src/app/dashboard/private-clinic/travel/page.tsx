import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import Link from "next/link";
import { formatClientNameForDisplay, formatMoneyLineForDisplay } from "@/lib/privacy-display";
import { formatHouseholdDate, formatHouseholdDateUtcWithTime } from "@/lib/household-date-format";
import { privateClinicCommon, privateClinicTravel } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import {
  createTherapyTravelEntry,
  deleteTherapyTravelEntry,
  updateTherapyTravelEntry,
} from "../actions";
import { formatJobDisplayLabel } from "@/lib/job-label";
import {
  jobWherePrivateClinicScoped,
  jobsWhereActiveForPrivateClinicPickers,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";

export const dynamic = "force-dynamic";
const TRAVEL_BASE = "/dashboard/private-clinic/travel";

export default async function TravelPage({
  searchParams,
}: {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    job?: string;
    client?: string;
    receipt?: string;
    from?: string;
    to?: string;
    bank?: string;
    modal?: string;
  }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const tv = privateClinicTravel(uiLanguage);
  const sp = searchParams ? await searchParams : {};
  const modalMode = sp.modal === "new" ? "new" : null;
  const jobFilter = sp.job || "";
  const clientFilter = sp.client || "";
  const receiptFilter = sp.receipt || "";
  const from = sp.from ? new Date(sp.from) : null;
  const to = sp.to ? new Date(sp.to) : null;
  const bankFilter = sp.bank || "all";
  const listParams = new URLSearchParams();
  if (jobFilter) listParams.set("job", jobFilter);
  if (clientFilter) listParams.set("client", clientFilter);
  if (receiptFilter) listParams.set("receipt", receiptFilter);
  if (sp.from) listParams.set("from", sp.from);
  if (sp.to) listParams.set("to", sp.to);
  if (bankFilter && bankFilter !== "all") listParams.set("bank", bankFilter);
  const baseListHref = listParams.size > 0 ? `${TRAVEL_BASE}?${listParams.toString()}` : TRAVEL_BASE;

  const [jobs, clients, treatments, entries] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId, familyMemberId }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_clients.findMany({
      where: {
        household_id: householdId,
        ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
        OR: [{ is_active: true }, ...(clientFilter ? [{ id: clientFilter }] : [])],
      },
      orderBy: { first_name: "asc" },
    }),
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId, job: jobScope },
      orderBy: { occurred_at: "desc" },
      take: 300,
      include: { client: true, job: true },
    }),
    prisma.therapy_travel_entries.findMany({
      where: {
        household_id: householdId,
        AND: [
          {
            OR: [{ job: jobScope }, { treatment: { job: jobScope } }],
          },
          ...(jobFilter
            ? [
                {
                  OR: [{ job_id: jobFilter }, { treatment: { job_id: jobFilter } }],
                },
              ]
            : []),
          ...(clientFilter ? [{ treatment: { client_id: clientFilter } }] : []),
          ...(receiptFilter
            ? [
                {
                  receipt_allocations: {
                    some: {
                      receipt_id: receiptFilter,
                    },
                  },
                },
              ]
            : []),
          ...(from || to
            ? [
                {
                  occurred_at: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                  },
                },
              ]
            : []),
          ...(bankFilter === "linked" ? [{ linked_transaction_id: { not: null } }] : []),
          ...(bankFilter === "unlinked" ? [{ linked_transaction_id: null }] : []),
        ],
      },
      orderBy: { created_at: "desc" },
      take: 500,
      include: { job: true, treatment: { include: { client: true, job: true } } },
    }),
  ]);
  const filteredReceipt = receiptFilter
    ? await prisma.therapy_receipts.findFirst({
        where: { id: receiptFilter, household_id: householdId, job: jobScope },
        select: { id: true, receipt_number: true },
      })
    : null;

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-500">{tv.intro}</p>
      {sp.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {sp.error}
        </p>
      )}
      {(sp.created || sp.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {c.saved}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{tv.filters}</h2>
        {filteredReceipt ? (
          <p className="text-xs text-slate-400">
            {c.filteredByReceipt(filteredReceipt.receipt_number)}{" "}
            <a href="/dashboard/private-clinic/travel" className="text-sky-400 hover:underline">
              {c.cancel}
            </a>
          </p>
        ) : null}
        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          method="get"
        >
          {receiptFilter ? <input type="hidden" name="receipt" value={receiptFilter} /> : null}
          <div>
            <label className="block text-xs text-slate-400">{c.job}</label>
            <select
              name="job"
              defaultValue={jobFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{c.any}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatJobDisplayLabel(j)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.client}</label>
            <select
              name="client"
              defaultValue={clientFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{c.any}</option>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.first_name} {cl.last_name ?? ""}
                  {!cl.is_active ? ` (${c.inactive})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{tv.filterBankLink}</label>
            <select
              name="bank"
              defaultValue={bankFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">{tv.bankLinkAll}</option>
              <option value="linked">{tv.bankLinkLinked}</option>
              <option value="unlinked">{tv.bankLinkUnlinked}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.from}</label>
            <input
              name="from"
              type="date"
              defaultValue={sp.from ?? ""}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.to}</label>
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
            {c.apply}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-200">{tv.entriesCount(entries.length)}</h2>
          <Link
            href={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=new`}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {tv.addTravel}
          </Link>
        </div>
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
                      ? `${tv.scopeTreatment} ${formatClientNameForDisplay(obfuscate, e.treatment.client.first_name, e.treatment.client.last_name)} (${formatJobDisplayLabel(e.treatment.job)})`
                      : e.job
                        ? `${tv.scopeJob} ${formatJobDisplayLabel(e.job)}`
                        : "—"}
                    {e.amount != null
                      ? ` — ${formatMoneyLineForDisplay(obfuscate, e.amount.toString(), e.currency, uiLanguage)}`
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
                          {formatJobDisplayLabel(j)}
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

      {modalMode === "new" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6">
          <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium text-slate-100">{tv.addTravel}</h3>
              <Link href={baseListHref} className="text-sm text-slate-400 hover:text-slate-200">
                {c.cancel}
              </Link>
            </div>
            <form action={createTherapyTravelEntry} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="redirect_on_success" value={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}created=1`} />
              <input type="hidden" name="redirect_on_error" value={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=new`} />
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
                    {formatJobDisplayLabel(j)}
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
                    {formatClientNameForDisplay(obfuscate, t.client.first_name, t.client.last_name)} — {formatJobDisplayLabel(t.job)}
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
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                >
                  {c.save}
                </button>
                <Link href={baseListHref} className="text-sm text-slate-400 hover:text-slate-200">
                  {c.cancel}
                </Link>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
