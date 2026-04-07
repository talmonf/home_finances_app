import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createTherapyProgram, deleteTherapyProgram } from "../actions";

export const dynamic = "force-dynamic";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolved = searchParams ? await searchParams : undefined;

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [jobs, programs] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true, ...(familyMemberId ? { family_member_id: familyMemberId } : { id: "__none__" }) },
      orderBy: { start_date: "desc" },
      include: { family_member: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: {
        household_id: householdId,
        ...(familyMemberId ? { job: { family_member_id: familyMemberId } } : { id: "__none__" }),
      },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      include: { job: true },
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
        <h2 className="text-lg font-medium text-slate-200">Add program</h2>
        <form
          action={createTherapyProgram}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <select
            name="job_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Job</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_title} {j.employer_name ? `- ${j.employer_name}` : ""} — {j.family_member.full_name}
              </option>
            ))}
          </select>
          <input
            name="name"
            placeholder="Program name"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="space-y-1">
            <input
              name="sort_order"
              type="number"
              placeholder="Sort order (optional)"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <p className="text-xs text-slate-400">
              Lower values appear first (for example: 10, 20, 30). Leave empty to use 0.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="is_active" defaultChecked />
            Active
          </label>
          <textarea
            name="description"
            placeholder="Description (optional)"
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Add program
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Programs</h2>
        {!familyMemberId ? (
          <p className="text-sm text-slate-500">Your user is not linked to a family member, so jobs cannot be loaded.</p>
        ) : programs.length === 0 ? (
          <p className="text-sm text-slate-500">No programs yet. Add a job under Jobs, then define programs here.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-3 py-2 text-slate-300">Name</th>
                  <th className="px-3 py-2 text-slate-300">Job</th>
                  <th className="px-3 py-2 text-slate-300">Sort</th>
                  <th className="px-3 py-2 text-slate-300">Active</th>
                  <th className="px-3 py-2 text-slate-300">Delete</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id} className="border-b border-slate-700/80">
                    <td className="px-3 py-2 text-slate-100">{p.name}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {p.job.job_title} {p.job.employer_name ? `- ${p.job.employer_name}` : ""}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{p.sort_order}</td>
                    <td className="px-3 py-2 text-slate-400">{p.is_active ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">
                      <ConfirmDeleteForm action={deleteTherapyProgram}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                          Delete
                        </button>
                      </ConfirmDeleteForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
