import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { SetupSectionMarkNotDoneBanner } from "@/app/dashboard/setup-section-mark-not-done-banner";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createProperty } from "./actions";
import { PropertyModalForm } from "./property-modal-form";

export const dynamic = "force-dynamic";

const PROPERTIES_BASE = "/dashboard/properties";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    modal?: string;
  }>;
};

export default async function PropertiesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const modalMode = resolvedSearchParams?.modal === "new" ? "new" : null;

  const properties = await prisma.properties.findMany({
    where: { household_id: householdId },
    include: { _count: { select: { utilities: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <SetupSectionMarkNotDoneBanner sectionId="properties" redirectPath="/dashboard/properties" />
          <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
            {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Homes &amp; properties</h1>
          <p className="text-sm text-slate-400">
            Define homes or apartments the household owns or lives in, and the utility companies that service them.
          </p>
          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.error) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolvedSearchParams.error
                ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                : resolvedSearchParams.created
                  ? "Property added."
                  : "Updated."}
            </div>
          )}
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "נכסים" : "Properties"}</h2>
            <Link
              href={`${PROPERTIES_BASE}?modal=new`}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              {isHebrew ? "הוספת נכס" : "Add property"}
            </Link>
          </div>
          {properties.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {isHebrew
                ? "אין עדיין נכסים. לחצו על ״הוספת נכס״ כדי להוסיף נכס, ואז פתחו אותו כדי להוסיף חברות תשתית."
                : "No properties yet. Use “Add property” to add one, then open it to add utility companies."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Type</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Address</th>
                    <th className="px-4 py-3 font-medium text-slate-300">In whose name</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Utilities</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr key={p.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{p.name}</td>
                      <td className="px-4 py-3 text-slate-400">{p.property_type ?? "—"}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-400" title={p.address ?? ""}>
                        {p.address ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{p.landlord_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={p.is_active ? "text-emerald-400" : "text-slate-500"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{p._count.utilities}</td>
                      <td className="px-4 py-3 space-x-3">
                        <Link
                          href={`/dashboard/properties/${p.id}`}
                          className="text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          {isHebrew ? "עריכה" : "Edit"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {modalMode === "new" ? (
          <PropertyModalForm
            action={createProperty}
            closeHref={PROPERTIES_BASE}
            redirectOnSuccess={`${PROPERTIES_BASE}?created=1`}
            redirectOnError={`${PROPERTIES_BASE}?modal=new`}
            isHebrew={isHebrew}
          />
        ) : null}
      </div>
    </div>
  );
}
