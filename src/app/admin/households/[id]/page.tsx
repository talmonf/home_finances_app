import { prisma, requireSuperAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import bcrypt from "bcryptjs";

type PageProps = {
  params: { id: string };
  searchParams?: {
    created?: string;
    updated?: string;
    error?: string;
  };
};

export default async function HouseholdUsersPage({
  params,
  searchParams,
}: PageProps) {
  await requireSuperAdmin();

  // Guard against missing or invalid route parameter to avoid Prisma errors
  if (!params?.id) {
    notFound();
  }

  const householdId = params.id;

  const household = await prisma.households.findUnique({
    where: { id: householdId },
  });

  if (!household) {
    notFound();
  }

  const users = await prisma.users.findMany({
    where: { household_id: householdId },
    orderBy: { created_at: "asc" },
  });

  async function createUser(formData: FormData) {
    "use server";

    await requireSuperAdmin();

    const householdId = formData.get("household_id") as string;
    const email = (formData.get("email") as string | null)?.trim();
    const fullName = (formData.get("full_name") as string | null)?.trim();
    const role = (formData.get("role") as string | null)?.trim();
    const userType = (formData.get("user_type") as string | null)?.trim();
    const password = (formData.get("password") as string | null) ?? "";

    if (!email || !fullName || !role || !userType || !password) {
      redirect(
        `/admin/households/${householdId}?error=${encodeURIComponent("All fields are required")}`,
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        household_id: householdId,
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role: role as "admin" | "member",
        user_type: userType as any,
        is_active: true,
      },
    });

    revalidatePath(`/admin/households/${householdId}`);
    redirect(`/admin/households/${householdId}?created=1`);
  }

  async function toggleUserActive(userId: string, nextActive: boolean) {
    "use server";

    await requireSuperAdmin();

    await prisma.users.update({
      where: { id: userId },
      data: { is_active: nextActive },
    });

    revalidatePath(`/admin/households/${householdId}`);
    redirect(`/admin/households/${householdId}?updated=1`);
  }

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-50">
                Household users
              </h1>
              <p className="text-sm text-slate-400">
                Manage users for{" "}
                <span className="font-semibold text-slate-100">
                  {household.name}
                </span>
                .
              </p>
            </div>
          </div>

          {(searchParams?.created || searchParams?.updated || searchParams?.error) && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                searchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/60 text-emerald-100"
              }`}
            >
              <span>
                {searchParams.error
                  ? decodeURIComponent(searchParams.error)
                  : searchParams.created
                    ? "User created successfully."
                    : "User updated successfully."}
              </span>
            </div>
          )}
        </header>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">
            Add user
          </h2>
          <form
            action={createUser}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <input type="hidden" name="household_id" value={household.id} />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Full name
              </label>
              <input
                name="full_name"
                required
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Role
              </label>
              <select
                name="role"
                defaultValue="admin"
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                User type
              </label>
              <select
                name="user_type"
                defaultValue="family_member"
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="family_member">Family member</option>
                <option value="financial_advisor">Financial advisor</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="flex items-end justify-end md:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Create user
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">
            Existing users
          </h2>
          {users.length === 0 ? (
            <p className="text-sm text-slate-400">
              No users have been created for this household yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">User type</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-800 last:border-0"
                    >
                      <td className="py-2 pr-4 text-xs text-slate-300">
                        {u.email}
                      </td>
                      <td className="py-2 pr-4">{u.full_name}</td>
                      <td className="py-2 pr-4 text-xs capitalize">
                        {u.role}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {u.user_type.replace("_", " ")}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {u.is_active ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-slate-300">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <form
                          action={async () => {
                            "use server";
                            await toggleUserActive(u.id, !u.is_active);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

