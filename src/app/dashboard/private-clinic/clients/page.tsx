import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createTherapyClient, updateTherapyClient } from "../actions";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolved = searchParams ? await searchParams : undefined;

  const [jobs, programs, clients] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { start_date: "desc" },
      include: { family_member: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      include: { job: true },
    }),
    prisma.therapy_clients.findMany({
      where: { household_id: householdId },
      orderBy: { created_at: "desc" },
      include: {
        client_jobs: { include: { job: true } },
        default_program: true,
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {resolved?.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {resolved.error}
        </p>
      )}
      {(resolved?.created || resolved?.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          Saved.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Add client</h2>
        <form
          action={createTherapyClient}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <input
            name="first_name"
            placeholder="First name"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="last_name"
            placeholder="Last name (optional)"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="id_number"
            placeholder="ID (optional)"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input name="start_date" type="date" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="phones"
            placeholder="Phones"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <textarea
            name="address"
            placeholder="Address"
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <textarea
            name="notes"
            placeholder="Notes"
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs text-slate-400">Default program (sets job)</label>
            <select
              name="default_program_id"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Select program</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.job.job_title} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <p className="text-xs text-slate-400">Also seen under these jobs (includes default)</p>
            <div className="flex flex-wrap gap-3">
              {jobs.map((j) => (
                <label key={j.id} className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" name="job_ids" value={j.id} />
                  {j.job_title}
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Add client
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Clients</h2>
        {clients.length === 0 ? (
          <p className="text-sm text-slate-500">No clients yet.</p>
        ) : (
          <div className="space-y-6">
            {clients.map((c) => (
              <form
                key={c.id}
                action={updateTherapyClient}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid md:grid-cols-2 md:gap-3"
              >
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="first_name"
                  defaultValue={c.first_name}
                  required
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="last_name"
                  defaultValue={c.last_name ?? ""}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="id_number"
                  defaultValue={c.id_number ?? ""}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="start_date"
                  type="date"
                  defaultValue={c.start_date ? c.start_date.toISOString().slice(0, 10) : ""}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="email"
                  defaultValue={c.email ?? ""}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="phones"
                  defaultValue={c.phones ?? ""}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <textarea
                  name="address"
                  defaultValue={c.address ?? ""}
                  className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <textarea
                  name="notes"
                  defaultValue={c.notes ?? ""}
                  className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400">Default program</label>
                  <select
                    name="default_program_id"
                    defaultValue={c.default_program_id}
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
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  {jobs.map((j) => {
                    const checked = c.client_jobs.some((x) => x.job_id === j.id);
                    return (
                      <label key={j.id} className="flex items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" name="job_ids" value={j.id} defaultChecked={checked} />
                        {j.job_title}
                      </label>
                    );
                  })}
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" name="is_active" defaultChecked={c.is_active} />
                  Active
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                >
                  Save client
                </button>
              </form>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
