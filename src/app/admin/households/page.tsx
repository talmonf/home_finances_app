import { prisma, requireSuperAdmin } from "@/lib/auth";

export default async function HouseholdsAdminPage() {
  await requireSuperAdmin();

  const households = await prisma.households.findMany({
    orderBy: { created_at: "desc" },
  });

  async function createHousehold(formData: FormData) {
    "use server";

    await requireSuperAdmin();

    const name = (formData.get("name") as string | null)?.trim();
    const country = ((formData.get("country") as string | null) || "IL").trim();
    const currency =
      ((formData.get("primary_currency") as string | null) || "ILS").trim();

    if (!name) {
      throw new Error("Household name is required");
    }

    await prisma.households.create({
      data: {
        id: crypto.randomUUID(),
        name,
        country,
        primary_currency: currency,
      },
    });
  }

  async function toggleHouseholdActive(id: string, nextActive: boolean) {
    "use server";

    await requireSuperAdmin();

    await prisma.households.update({
      where: { id },
      data: { is_active: nextActive },
    });
  }

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">
              Households (Super Admin)
            </h1>
            <p className="text-sm text-slate-400">
              Create and manage all households on the platform.
            </p>
          </div>
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
                      <td className="py-2 pr-4 text-right">
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

