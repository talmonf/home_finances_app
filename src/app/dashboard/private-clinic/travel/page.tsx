import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatClientNameForDisplay } from "@/lib/privacy-display";
import { formatHouseholdDate } from "@/lib/household-date-format";
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
import { TravelAddButton } from "./travel-add-button";
import { TravelListClient } from "./travel-list-client";
import { TravelModalForm } from "./travel-modal-form";
import { loadTravelRows, parseTravelReceivedFilter, type TravelListFilters } from "./travel-list-data";

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
    received?: string;
    modal?: string;
    edit_id?: string;
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
  const modalMode = sp.modal === "edit" ? "edit" : sp.modal === "new" ? "new" : null;
  const filters: TravelListFilters = {
    job: sp.job?.trim() || "",
    client: sp.client?.trim() || "",
    receipt: sp.receipt?.trim() || "",
    from: sp.from?.trim() || "",
    to: sp.to?.trim() || "",
    received: parseTravelReceivedFilter(sp.received),
  };
  const listParams = new URLSearchParams();
  if (filters.job) listParams.set("job", filters.job);
  if (filters.client) listParams.set("client", filters.client);
  if (filters.receipt) listParams.set("receipt", filters.receipt);
  if (filters.from) listParams.set("from", filters.from);
  if (filters.to) listParams.set("to", filters.to);
  if (filters.received !== "all") listParams.set("received", filters.received);
  const baseListHref = listParams.size > 0 ? `${TRAVEL_BASE}?${listParams.toString()}` : TRAVEL_BASE;

  const [jobs, clients, treatments, rows] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId, familyMemberId }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_clients.findMany({
      where: {
        household_id: householdId,
        ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
        OR: [{ is_active: true }, ...(filters.client ? [{ id: filters.client }] : [])],
      },
      orderBy: { first_name: "asc" },
    }),
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId, job: jobScope },
      orderBy: { occurred_at: "desc" },
      take: 300,
      include: { client: true, job: true },
    }),
    loadTravelRows({
      householdId,
      familyMemberId,
      filters,
      take: 500,
    }),
  ]);
  const filteredReceipt = filters.receipt
    ? await prisma.therapy_receipts.findFirst({
        where: { id: filters.receipt, household_id: householdId, job: jobScope },
        select: { id: true, receipt_number: true },
      })
    : null;
  const editId = sp.edit_id?.trim() || "";
  const editEntry =
    modalMode === "edit" && editId
      ? await prisma.therapy_travel_entries.findFirst({
          where: {
            id: editId,
            household_id: householdId,
            OR: [{ job: jobScope }, { treatment: { job: jobScope } }],
          },
          include: { treatment: { include: { client: true, job: true } }, job: true },
        })
      : null;
  const jobOptions = jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }));
  const treatmentOptions = treatments.map((t) => ({
    id: t.id,
    label: `${formatHouseholdDate(t.occurred_at, dateDisplayFormat)} — ${formatClientNameForDisplay(obfuscate, t.client.first_name, t.client.last_name)} — ${formatJobDisplayLabel(t.job)}`,
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
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
          className="grid gap-2.5 rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-6"
          method="get"
        >
          {filters.receipt ? <input type="hidden" name="receipt" value={filters.receipt} /> : null}
          <div>
            <label className="block text-xs text-slate-400">{c.job}</label>
            <select
              name="job"
              defaultValue={filters.job}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
              defaultValue={filters.client}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
              name="received"
              defaultValue={filters.received}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">{tv.receivedAll}</option>
              <option value="linked">{tv.receivedLinked}</option>
              <option value="unlinked">{tv.receivedUnlinked}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.from}</label>
            <input
              name="from"
              type="date"
              defaultValue={filters.from}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.to}</label>
            <input
              name="to"
              type="date"
              defaultValue={filters.to}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 sm:mt-auto"
          >
            {c.apply}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-200">{tv.entriesCount(rows.length)}</h2>
          <TravelAddButton href={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=new`} label={tv.addTravel} />
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{c.travelEmpty}</p>
        ) : (
          <TravelListClient
            rows={rows}
            listBaseHref={baseListHref}
            dateDisplayFormat={dateDisplayFormat}
            uiLanguage={uiLanguage}
            obfuscate={obfuscate}
            labels={{
              when: c.when,
              type: c.type,
              job: c.job,
              amount: c.amount,
              receipt: tv.receipt,
              edit: c.edit,
              scopeTreatment: tv.scopeTreatment,
              scopeJob: tv.scopeJob,
              linked: tv.receivedLinked,
              unlinked: tv.receivedUnlinked,
              noDate: c.noDate,
            }}
          />
        )}
      </section>

      {modalMode === "new" ? (
        <TravelModalForm
          action={createTherapyTravelEntry}
          title={tv.addTravel}
          closeHref={baseListHref}
          redirectOnSuccess={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}created=1`}
          redirectOnError={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=new`}
          householdId={householdId}
          uiLanguage={uiLanguage}
          jobOptions={jobOptions}
          treatmentOptions={treatmentOptions}
          c={c}
          tv={tv}
        />
      ) : null}
      {modalMode === "edit" && editEntry ? (
        <TravelModalForm
          action={updateTherapyTravelEntry}
          deleteAction={deleteTherapyTravelEntry}
          title={c.edit}
          closeHref={baseListHref}
          redirectOnSuccess={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}updated=1`}
          redirectOnError={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=edit&edit_id=${encodeURIComponent(editEntry.id)}`}
          householdId={householdId}
          uiLanguage={uiLanguage}
          jobOptions={jobOptions}
          treatmentOptions={treatmentOptions}
          c={c}
          tv={tv}
          initial={{
            id: editEntry.id,
            link_scope: editEntry.treatment_id ? "treatment" : "job",
            job_id: editEntry.job_id ?? "",
            treatment_id: editEntry.treatment_id ?? "",
            occurred_at: editEntry.occurred_at ? editEntry.occurred_at.toISOString().slice(0, 16) : "",
            amount: editEntry.amount?.toString() ?? "",
            currency: editEntry.currency,
            linked_transaction_id: editEntry.linked_transaction_id ?? "",
            notes: editEntry.notes ?? "",
          }}
        />
      ) : null}
    </div>
  );
}
