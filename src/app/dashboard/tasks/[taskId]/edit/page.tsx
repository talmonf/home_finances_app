import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateTask } from "../../actions";

type PageProps = {
  params: Promise<{
    taskId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/tasks?error=No+household");

  const { taskId } = await params;

  const [task, familyMembers, advisors] = await Promise.all([
    prisma.tasks.findFirst({
      where: { id: taskId, household_id: householdId },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.users.findMany({
      where: { household_id: householdId, user_type: "financial_advisor", is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  if (!task) notFound();

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-3xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/tasks"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to tasks
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Edit task</h1>
          <p className="text-sm text-slate-400">Update task details and save to return to the tasks list.</p>
        </header>

        <form action={updateTask} className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2">
          <input type="hidden" name="task_id" value={task.id} />

          <div className="sm:col-span-2">
            <label htmlFor="subject" className="mb-1 block text-xs font-medium text-slate-400">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              required
              defaultValue={task.subject}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="mb-1 block text-xs font-medium text-slate-400">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={task.description ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-400">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={task.status}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="open">Open</option>
              <option value="in_work">In Work</option>
              <option value="on_hold">On Hold</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="mb-1 block text-xs font-medium text-slate-400">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue={task.priority}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
              Family member assignee
            </label>
            <select
              id="family_member_id"
              name="family_member_id"
              defaultValue={task.family_member_id ?? ""}
              className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Select family member</option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>

            <label htmlFor="assigned_user_id" className="mb-1 mt-2 block text-xs font-medium text-slate-400">
              Advisor assignee
            </label>
            <select
              id="assigned_user_id"
              name="assigned_user_id"
              defaultValue={task.assigned_user_id ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Select advisor</option>
              {advisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="link_1_title" className="mb-1 block text-xs font-medium text-slate-400">
              Link 1 title
            </label>
            <input
              id="link_1_title"
              name="link_1_title"
              defaultValue={task.link_1_title ?? ""}
              className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="e.g. Vendor portal"
            />
            <label htmlFor="link_1_url" className="mb-1 block text-xs font-medium text-slate-400">
              Link 1 URL
            </label>
            <input
              id="link_1_url"
              name="link_1_url"
              type="url"
              defaultValue={task.link_1_url ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="https://..."
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="link_2_title" className="mb-1 block text-xs font-medium text-slate-400">
              Link 2 title
            </label>
            <input
              id="link_2_title"
              name="link_2_title"
              defaultValue={task.link_2_title ?? ""}
              className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="e.g. Reference doc"
            />
            <label htmlFor="link_2_url" className="mb-1 block text-xs font-medium text-slate-400">
              Link 2 URL
            </label>
            <input
              id="link_2_url"
              name="link_2_url"
              type="url"
              defaultValue={task.link_2_url ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="https://..."
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Save task
            </button>
            <Link
              href="/dashboard/tasks"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
