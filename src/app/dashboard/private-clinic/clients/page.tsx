import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
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
                  <input
                    name="first_name"
                    defaultValue={row.first_name}
                    required
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                  <input
                    name="last_name"
                    defaultValue={row.last_name ?? ""}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                  <input
                    name="id_number"
                    defaultValue={row.id_number ?? ""}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={row.start_date ? row.start_date.toISOString().slice(0, 10) : ""}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                  <div className="space-y-1">
                    <input
                      name="email"
                      defaultValue={row.email ?? ""}
                      placeholder={cl.email}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                    {row.email && (
                      <a href={`mailto:${row.email}`} className="text-xs text-sky-400 hover:text-sky-300">
                        {row.email}
                      </a>
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      name="mobile_phone"
                      defaultValue={phones.mobile}
                      placeholder={cl.mobilePhone}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                    {phones.mobile && (
                      <a href={`tel:${phones.mobile}`} className="text-xs text-sky-400 hover:text-sky-300">
                        {phones.mobile}
                      </a>
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      name="home_phone"
                      defaultValue={phones.home}
                      placeholder={cl.homePhone}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                    {phones.home && (
                      <a href={`tel:${phones.home}`} className="text-xs text-sky-400 hover:text-sky-300">
                        {phones.home}
                      </a>
                    )}
                  </div>
                  <input
                    name="address"
                    defaultValue={row.address ?? ""}
                    placeholder={cl.address}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                  <textarea
                    name="notes"
                    defaultValue={row.notes ?? ""}
                    placeholder={c.notes}
                    className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                  <ClientJobProgramFields
                    jobs={jobOptions}
                    programs={programOptions}
                    defaultJobId={row.default_job_id}
                    defaultProgramId={row.default_program_id}
                    defaultCheckedJobIds={row.client_jobs.map((x) => x.job_id)}
                    labels={jobFieldLabels}
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" name="is_active" defaultChecked={row.is_active} />
                    {c.active}
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
