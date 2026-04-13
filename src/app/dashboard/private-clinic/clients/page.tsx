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
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <input
            name="first_name"
            placeholder={cl.firstName}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="last_name"
            placeholder={cl.lastNameOptional}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="id_number"
            placeholder={cl.idOptional}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{c.startDate}</label>
            <input name="start_date" type="date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{cl.endDate}</label>
            <input name="end_date" type="date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
          </div>
          <input
            name="email"
            type="email"
            placeholder={cl.email}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="mobile_phone"
            placeholder={cl.mobilePhone}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="home_phone"
            placeholder={cl.homePhone}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="address"
            placeholder={cl.address}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{cl.visitFrequency}</label>
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
            <label className="block text-xs text-slate-400">{cl.disabilityStatus}</label>
            <select
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
            <label className="block text-xs text-slate-400">{cl.rehabBasketStatus}</label>
            <select
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
          <textarea
            name="notes"
            placeholder={c.notes}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
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
                  className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid md:grid-cols-2 md:gap-3"
                >
                  <input type="hidden" name="id" value={row.id} />
                  {obfuscate ? <input type="hidden" name="first_name" value={row.first_name} /> : null}
                  {obfuscate ? (
                    <input
                      readOnly
                      value={OBFUSCATED}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      aria-label={cl.firstName}
                    />
                  ) : (
                    <input
                      name="first_name"
                      defaultValue={row.first_name}
                      required
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  )}
                  {obfuscate ? <input type="hidden" name="last_name" value={row.last_name ?? ""} /> : null}
                  {obfuscate ? (
                    <input
                      readOnly
                      value={OBFUSCATED}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      aria-label={cl.lastNameOptional}
                    />
                  ) : (
                    <input
                      name="last_name"
                      defaultValue={row.last_name ?? ""}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  )}
                  {obfuscate ? <input type="hidden" name="id_number" value={row.id_number ?? ""} /> : null}
                  {obfuscate ? (
                    <input
                      readOnly
                      value={row.id_number ? OBFUSCATED : ""}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      aria-label={cl.idOptional}
                    />
                  ) : (
                    <input
                      name="id_number"
                      defaultValue={row.id_number ?? ""}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  )}
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-400">{c.startDate}</label>
                    <input
                      name="start_date"
                      type="date"
                      defaultValue={toDateInputValue(row.start_date)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-400">{cl.endDate}</label>
                    <input
                      name="end_date"
                      type="date"
                      defaultValue={toDateInputValue(row.end_date)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    {obfuscate ? <input type="hidden" name="email" value={row.email ?? ""} /> : null}
                    {obfuscate ? (
                      <input
                        readOnly
                        value={row.email ? OBFUSCATED : ""}
                        placeholder={cl.email}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    ) : (
                      <input
                        name="email"
                        defaultValue={row.email ?? ""}
                        placeholder={cl.email}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                    {row.email && !obfuscate ? (
                      <a href={`mailto:${row.email}`} className="text-xs text-sky-400 hover:text-sky-300">
                        {row.email}
                      </a>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {obfuscate ? (
                      <>
                        <input type="hidden" name="mobile_phone" value={phones.mobile} />
                        <input
                          readOnly
                          value={phones.mobile ? OBFUSCATED : ""}
                          placeholder={cl.mobilePhone}
                          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                        />
                      </>
                    ) : (
                      <input
                        name="mobile_phone"
                        defaultValue={phones.mobile}
                        placeholder={cl.mobilePhone}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                    {phones.mobile && !obfuscate ? (
                      <a href={`tel:${phones.mobile}`} className="text-xs text-sky-400 hover:text-sky-300">
                        {phones.mobile}
                      </a>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {obfuscate ? (
                      <>
                        <input type="hidden" name="home_phone" value={phones.home} />
                        <input
                          readOnly
                          value={phones.home ? OBFUSCATED : ""}
                          placeholder={cl.homePhone}
                          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                        />
                      </>
                    ) : (
                      <input
                        name="home_phone"
                        defaultValue={phones.home}
                        placeholder={cl.homePhone}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                    {phones.home && !obfuscate ? (
                      <a href={`tel:${phones.home}`} className="text-xs text-sky-400 hover:text-sky-300">
                        {phones.home}
                      </a>
                    ) : null}
                  </div>
                  {obfuscate ? <input type="hidden" name="address" value={row.address ?? ""} /> : null}
                  {obfuscate ? (
                    <input
                      readOnly
                      value={row.address ? OBFUSCATED : ""}
                      placeholder={cl.address}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  ) : (
                    <input
                      name="address"
                      defaultValue={row.address ?? ""}
                      placeholder={cl.address}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  )}
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-400">{cl.visitFrequency}</label>
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
                    <label className="block text-xs text-slate-400">{cl.disabilityStatus}</label>
                    <select
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
                    <label className="block text-xs text-slate-400">{cl.rehabBasketStatus}</label>
                    <select
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
                  {obfuscate ? (
                    <textarea
                      readOnly
                      value={row.notes ? OBFUSCATED : ""}
                      placeholder={c.notes}
                      className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  ) : (
                    <textarea
                      name="notes"
                      defaultValue={row.notes ?? ""}
                      placeholder={c.notes}
                      className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  )}
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
