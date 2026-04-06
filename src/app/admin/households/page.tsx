import { prisma, requireSuperAdmin } from "@/lib/auth";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

export default async function HouseholdsAdminPage({ searchParams }: PageProps) {
  await requireSuperAdmin();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const households = await prisma.households.findMany({
    orderBy: { created_at: "desc" },
    include: {
      _count: { select: { users: true } },
    },
  });

  async function createHousehold(formData: FormData) {
    "use server";

    await requireSuperAdmin();

    const name = (formData.get("name") as string | null)?.trim();
    const country = ((formData.get("country") as string | null) || "IL").trim();
    const currency =
      ((formData.get("primary_currency") as string | null) || "ILS").trim();

    if (!name) {
      redirect("/admin/households?error=Household+name+is+required");
    }

    await prisma.households.create({
      data: {
        id: crypto.randomUUID(),
        name,
        country,
        primary_currency: currency,
      },
    });

    revalidatePath("/admin/households");
    redirect("/admin/households?created=1");
  }

  async function toggleHouseholdActive(id: string, nextActive: boolean) {
    "use server";

    await requireSuperAdmin();

    await prisma.households.update({
      where: { id },
      data: { is_active: nextActive },
    });

    revalidatePath("/admin/households");
    redirect("/admin/households?updated=1");
  }

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">
              Households (Super Admin)
            </h1>
            <p className="text-sm text-slate-400">
              Create and manage all households on the platform.
            </p>
          </div>

          {(resolvedSearchParams?.created || resolvedSearchParams?.updated || resolvedSearchParams?.error) && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/60 text-emerald-100"
              }`}
            >
              <span>
                {resolvedSearchParams.error
                  ? decodeURIComponent(resolvedSearchParams.error)
                  : resolvedSearchParams.created
                    ? "Household created successfully."
                    : "Household updated successfully."}
              </span>
              <Link
                href="/admin/households"
                className="ml-4 text-[11px] font-medium underline underline-offset-2"
              >
                Dismiss
              </Link>
            </div>
          )}
        </header>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">
            Create household
          </h2>
          <form action={createHousehold} className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Name
              </label>
              <input
                name="name"
                required
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                placeholder="e.g. Friedlander Household"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Country
              </label>
              <input
                name="country"
                defaultValue="IL"
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Primary currency
              </label>
              <input
                name="primary_currency"
                defaultValue="ILS"
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Create household
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">
            Existing households
          </h2>
          {households.length === 0 ? (
            <p className="text-sm text-slate-400">
              No households have been created yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Country</th>
                    <th className="py-2 pr-4">Currency</th>
                    <th className="py-2 pr-4">Users</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {households.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-slate-800 last:border-0"
                    >
                      <td className="py-2 pr-4">{h.name}</td>
                      <td className="py-2 pr-4">{h.country}</td>
                      <td className="py-2 pr-4">{h.primary_currency}</td>
                      <td className="py-2 pr-4 text-sm tabular-nums">
                        {h._count.users > 0 ? (
                          <Link
                            href={`/admin/households/${h.id}`}
                            className="font-medium text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:text-sky-200"
                          >
                            {h._count.users}
                          </Link>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-400">
                        {h.created_at.toISOString().slice(0, 10)}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {h.is_active ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-slate-300">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="flex flex-wrap items-center justify-end gap-2 py-2 pr-4">
                        <Link
                          href={`/admin/households/${h.id}/edit`}
                          className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/households/${h.id}`}
                          className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                        >
                          Manage users
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await toggleHouseholdActive(h.id, !h.is_active);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                          >
                            {h.is_active ? "Deactivate" : "Activate"}
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

