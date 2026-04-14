import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { OBFUSCATED } from "@/lib/privacy-display";
import { privateClinicClients, privateClinicCommon, privateClinicJobs } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { createTherapyClient, updateTherapyClient } from "../actions";
import { ClientJobProgramFields } from "./client-job-program-fields";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const cl = privateClinicClients(uiLanguage);
  const j = privateClinicJobs(uiLanguage);

  const resolved = searchParams ? await searchParams : undefined;

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [jobs, programs, clients] = await Promise.all([
    prisma.jobs.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
      },
      orderBy: { start_date: "desc" },
      include: { family_member: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        ...(familyMemberId ? { job: { family_member_id: familyMemberId } } : {}),
      },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      include: { job: true },
    }),
    prisma.therapy_clients.findMany({
      where: { household_id: householdId },
      orderBy: { created_at: "desc" },
      include: {
        client_jobs: { include: { job: true } },
        default_program: true,
        default_job: true,
      },
    }),
  ]);

  const jobOptions = jobs.map((j) => ({
    id: j.id,
    label: `${j.job_title}${j.employer_name ? ` - ${j.employer_name}` : ""}`,
  }));
  const programOptions = programs.map((p) => ({
    id: p.id,
    jobId: p.job_id,
    label: `${p.name}${p.job.employer_name ? ` (${p.job.employer_name})` : ""}`,
  }));
  function splitPhones(value: string | null | undefined): { mobile: string; home: string } {
    const text = value ?? "";
    const parts = text
      .split(/\r?\n|[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { mobile: parts[0] ?? "", home: parts[1] ?? "" };
  }

  const jobFieldLabels = {
    defaultJob: cl.defaultJob,
    defaultProgramOptional: cl.defaultProgramOptional,
    selectJob: cl.selectJob,
    none: c.none,
    alsoSeenUnder: cl.alsoSeenUnder,
  };
  const statusOptions = [
    { value: "none", label: cl.statusNone },
    { value: "exists", label: cl.statusExists },
    { value: "filed_in_hospitalization", label: cl.statusFiledInHospitalization },
    { value: "filed_recognized", label: cl.statusFiledRecognized },
    { value: "filed_rejected", label: cl.statusFiledRejected },
    { value: "filed_appeal", label: cl.statusFiledAppeal },
    { value: "filed_worsening", label: cl.statusFiledWorsening },
  ];

  function toDateInputValue(d: Date | null | undefined) {
    if (!d) return "";
    const z = new Date(d);
    const y = z.getFullYear();
    const m = String(z.getMonth() + 1).padStart(2, "0");
    const day = String(z.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  return (
    <div className="space-y-8">
      {resolved?.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {resolved.error}
        </p>
      )}
      {(resolved?.created || resolved?.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {c.saved}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{cl.addClientTitle}</h2>
        {!familyMemberId && (
          <p className="rounded-lg border border-sky-700/50 bg-sky-950/30 px-3 py-2 text-sm text-sky-100">{j.clinicUnlinkedHint}</p>
        )}
        <form
          action={createTherapyClient}
          className="grid items-start gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <div className="space-y-1">
            <label htmlFor="new_first_name" className="block text-xs text-slate-400">
              {cl.firstName}
            </label>
            <input
              id="new_first_name"
              name="first_name"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new_last_name" className="block text-xs text-slate-400">
              {cl.lastNameOptional}
            </label>
            <input
              id="new_last_name"
              name="last_name"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new_id_number" className="block text-xs text-slate-400">
              {cl.idOptional}
            </label>
            <input
              id="new_id_number"
              name="id_number"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new_start_date" className="block text-xs text-slate-400">
              {c.startDate}
            </label>
            <input
              id="new_start_date"
              name="start_date"
              type="date"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new_end_date" className="block text-xs text-slate-400">
              {cl.endDate}
            </label>
            <input
              id="new_end_date"
              name="end_date"
              type="date"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new_email" className="block text-xs text-slate-400">
              {cl.email}
            </label>
            <input
              id="new_email"
              name="email"
              type="email"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new_mobile_phone" className="block text-xs text-slate-400">
              {cl.mobilePhone}
            </label>
            <input
              id="new_mobile_phone"
              name="mobile_phone"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new_home_phone" className="block text-xs text-slate-400">
              {cl.homePhone}
            </label>
            <input
              id="new_home_phone"
              name="home_phone"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new_address" className="block text-xs text-slate-400">
              {cl.address}
            </label>
            <input
              id="new_address"
              name="address"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400">{cl.visitFrequency}</p>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="new_visits_per_period_count">
                {cl.visitsPer}
              </label>
              <input
                id="new_visits_per_period_count"
                name="visits_per_period_count"
                type="number"
                min={1}
                max={14}
                step={1}
                defaultValue={1}
                className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <span className="text-xs text-slate-400">{cl.visitsPer}</span>
              <label className="sr-only" htmlFor="new_visits_per_period_weeks">
                {cl.weeks}
              </label>
              <input
                id="new_visits_per_period_weeks"
                name="visits_per_period_weeks"
                type="number"
                min={1}
                max={12}
                step={1}
                defaultValue={1}
                className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <span className="text-xs text-slate-400">{cl.weeks}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="new_disability_status" className="block text-xs text-slate-400">
              {cl.disabilityStatus}
            </label>
            <select
              id="new_disability_status"
              name="disability_status"
              defaultValue="none"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="new_rehab_basket_status" className="block text-xs text-slate-400">
              {cl.rehabBasketStatus}
            </label>
            <select
              id="new_rehab_basket_status"
              name="rehab_basket_status"
              defaultValue="none"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="new_notes" className="block text-xs text-slate-400">
              {c.notes}
            </label>
            <textarea
              id="new_notes"
              name="notes"
              className="min-h-[4.5rem] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <ClientJobProgramFields jobs={jobOptions} programs={programOptions} labels={jobFieldLabels} />
          <button
            type="submit"
            disabled={jobs.length === 0}
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cl.addClientBtn}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{cl.clientsHeading}</h2>
        {clients.length === 0 ? (
          <p className="text-sm text-slate-500">{c.clientsEmpty}</p>
        ) : (
          <div className="space-y-6">
            {clients.map((row) => {
              const phones = splitPhones(row.phones);
              return (
                <form
                  key={row.id}
                  action={updateTherapyClient}
                  className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid md:grid-cols-2 md:items-start md:gap-3"
                >
                  <input type="hidden" name="id" value={row.id} />
                  {obfuscate ? <input type="hidden" name="first_name" value={row.first_name} /> : null}
                  <div className="space-y-1">
                    <label htmlFor={`first_name_${row.id}`} className="block text-xs text-slate-400">
                      {cl.firstName}
                    </label>
                    {obfuscate ? (
                      <input
                        id={`first_name_${row.id}`}
                        readOnly
                        value={OBFUSCATED}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    ) : (
                      <input
                        id={`first_name_${row.id}`}
                        name="first_name"
                        defaultValue={row.first_name}
                        required
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                  </div>
                  {obfuscate ? <input type="hidden" name="last_name" value={row.last_name ?? ""} /> : null}
                  <div className="space-y-1">
                    <label htmlFor={`last_name_${row.id}`} className="block text-xs text-slate-400">
                      {cl.lastNameOptional}
                    </label>
                    {obfuscate ? (
                      <input
                        id={`last_name_${row.id}`}
                        readOnly
                        value={OBFUSCATED}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    ) : (
                      <input
                        id={`last_name_${row.id}`}
                        name="last_name"
                        defaultValue={row.last_name ?? ""}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                  </div>
                  {obfuscate ? <input type="hidden" name="id_number" value={row.id_number ?? ""} /> : null}
                  <div className="space-y-1">
                    <label htmlFor={`id_number_${row.id}`} className="block text-xs text-slate-400">
                      {cl.idOptional}
                    </label>
                    {obfuscate ? (
                      <input
                        id={`id_number_${row.id}`}
                        readOnly
                        value={row.id_number ? OBFUSCATED : ""}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    ) : (
                      <input
                        id={`id_number_${row.id}`}
                        name="id_number"
                        defaultValue={row.id_number ?? ""}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`start_date_${row.id}`} className="block text-xs text-slate-400">
                      {c.startDate}
                    </label>
                    <input
                      id={`start_date_${row.id}`}
                      name="start_date"
                      type="date"
                      defaultValue={toDateInputValue(row.start_date)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`end_date_${row.id}`} className="block text-xs text-slate-400">
                      {cl.endDate}
                    </label>
                    <input
                      id={`end_date_${row.id}`}
                      name="end_date"
                      type="date"
                      defaultValue={toDateInputValue(row.end_date)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={`email_${row.id}`} className="block text-xs text-slate-400">
                        {cl.email}
                      </label>
                      {row.email && !obfuscate ? (
                        <a
                          href={`mailto:${row.email}`}
                          className="shrink-0 text-xs text-sky-400 hover:text-sky-300"
                        >
                          {cl.composeEmail}
                        </a>
                      ) : null}
                    </div>
                    {obfuscate ? <input type="hidden" name="email" value={row.email ?? ""} /> : null}
                    {obfuscate ? (
                      <input
                        id={`email_${row.id}`}
                        readOnly
                        value={row.email ? OBFUSCATED : ""}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    ) : (
                      <input
                        id={`email_${row.id}`}
                        name="email"
                        type="email"
                        defaultValue={row.email ?? ""}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={`mobile_phone_${row.id}`} className="block text-xs text-slate-400">
                        {cl.mobilePhone}
                      </label>
                      {phones.mobile && !obfuscate ? (
                        <a
                          href={`tel:${phones.mobile}`}
                          className="shrink-0 text-xs text-sky-400 hover:text-sky-300"
                        >
                          {cl.callNumber}
                        </a>
                      ) : null}
                    </div>
                    {obfuscate ? (
                      <>
                        <input type="hidden" name="mobile_phone" value={phones.mobile} />
                        <input
                          id={`mobile_phone_${row.id}`}
                          readOnly
                          value={phones.mobile ? OBFUSCATED : ""}
                          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                        />
                      </>
                    ) : (
                      <input
                        id={`mobile_phone_${row.id}`}
                        name="mobile_phone"
                        defaultValue={phones.mobile}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={`home_phone_${row.id}`} className="block text-xs text-slate-400">
                        {cl.homePhone}
                      </label>
                      {phones.home && !obfuscate ? (
                        <a
                          href={`tel:${phones.home}`}
                          className="shrink-0 text-xs text-sky-400 hover:text-sky-300"
                        >
                          {cl.callNumber}
                        </a>
                      ) : null}
                    </div>
                    {obfuscate ? (
                      <>
                        <input type="hidden" name="home_phone" value={phones.home} />
                        <input
                          id={`home_phone_${row.id}`}
                          readOnly
                          value={phones.home ? OBFUSCATED : ""}
                          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                        />
                      </>
                    ) : (
                      <input
                        id={`home_phone_${row.id}`}
                        name="home_phone"
                        defaultValue={phones.home}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                  </div>
                  {obfuscate ? <input type="hidden" name="address" value={row.address ?? ""} /> : null}
                  <div className="space-y-1">
                    <label htmlFor={`address_${row.id}`} className="block text-xs text-slate-400">
                      {cl.address}
                    </label>
                    {obfuscate ? (
                      <input
                        id={`address_${row.id}`}
                        readOnly
                        value={row.address ? OBFUSCATED : ""}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    ) : (
                      <input
                        id={`address_${row.id}`}
                        name="address"
                        defaultValue={row.address ?? ""}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">{cl.visitFrequency}</p>
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`visits_per_period_count_${row.id}`}>
                        {cl.visitsPer}
                      </label>
                      <input
                        id={`visits_per_period_count_${row.id}`}
                        name="visits_per_period_count"
                        type="number"
                        min={1}
                        max={14}
                        step={1}
                        defaultValue={row.visits_per_period_count ?? 1}
                        className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                      <span className="text-xs text-slate-400">{cl.visitsPer}</span>
                      <label className="sr-only" htmlFor={`visits_per_period_weeks_${row.id}`}>
                        {cl.weeks}
                      </label>
                      <input
                        id={`visits_per_period_weeks_${row.id}`}
                        name="visits_per_period_weeks"
                        type="number"
                        min={1}
                        max={12}
                        step={1}
                        defaultValue={row.visits_per_period_weeks ?? 1}
                        className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                      <span className="text-xs text-slate-400">{cl.weeks}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`disability_status_${row.id}`} className="block text-xs text-slate-400">
                      {cl.disabilityStatus}
                    </label>
                    <select
                      id={`disability_status_${row.id}`}
                      name="disability_status"
                      defaultValue={row.disability_status ?? "none"}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`rehab_basket_status_${row.id}`} className="block text-xs text-slate-400">
                      {cl.rehabBasketStatus}
                    </label>
                    <select
                      id={`rehab_basket_status_${row.id}`}
                      name="rehab_basket_status"
                      defaultValue={row.rehab_basket_status ?? "none"}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {obfuscate ? <input type="hidden" name="notes" value={row.notes ?? ""} /> : null}
                  <div className="space-y-1 md:col-span-2">
                    <label htmlFor={`notes_${row.id}`} className="block text-xs text-slate-400">
                      {c.notes}
                    </label>
                    {obfuscate ? (
                      <textarea
                        id={`notes_${row.id}`}
                        readOnly
                        value={row.notes ? OBFUSCATED : ""}
                        className="min-h-[4.5rem] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    ) : (
                      <textarea
                        id={`notes_${row.id}`}
                        name="notes"
                        defaultValue={row.notes ?? ""}
                        className="min-h-[4.5rem] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                  </div>
                  <ClientJobProgramFields
                    jobs={jobOptions}
                    programs={programOptions}
                    defaultJobId={row.default_job_id}
                    defaultProgramId={row.default_program_id}
                    defaultCheckedJobIds={row.client_jobs.map((x) => x.job_id)}
                    labels={jobFieldLabels}
                  />
                  <label className="flex flex-col gap-1 text-sm text-slate-300 md:col-span-2">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" name="is_active" defaultChecked={row.is_active} />
                      {cl.statusLabel}
                    </span>
                    <span className="text-xs font-normal text-slate-500">{cl.statusHelp}</span>
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    {cl.saveClient}
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
