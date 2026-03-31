import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateUtility } from "../../../../actions";

const UTILITY_TYPE_LABELS: Record<string, string> = {
  electricity: "Electricity",
  water: "Water",
  internet: "Internet",
  telephone: "Telephone",
  gas: "Gas",
  other: "Other",
};

type PageProps = {
  params: Promise<{ id: string; utilityId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

export default async function UtilityEditPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/properties?error=No+household");

  const { id, utilityId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [property, utility, payees] = await Promise.all([
    prisma.properties.findFirst({
      where: { id, household_id: householdId },
      select: { id: true, name: true },
    }),
    prisma.property_utilities.findFirst({
      where: { id: utilityId, household_id: householdId, property_id: id },
    }),
    prisma.payees.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!property || !utility) notFound();

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-3xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href={`/dashboard/properties/${property.id}`}
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to property details
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Edit utility</h1>
          <p className="text-sm text-slate-400">
            {property.name}
          </p>
          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
            </div>
          )}
        </header>

        <form action={updateUtility} className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={utility.id} />
          <input type="hidden" name="property_id" value={property.id} />

          <div>
            <label htmlFor="utility_type" className="mb-1 block text-xs font-medium text-slate-400">Type</label>
            <select
              id="utility_type"
              name="utility_type"
              defaultValue={utility.utility_type}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {Object.entries(UTILITY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="provider_name" className="mb-1 block text-xs font-medium text-slate-400">Provider name</label>
            <input
              id="provider_name"
              name="provider_name"
              required
              defaultValue={utility.provider_name}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="payee_id" className="mb-1 block text-xs font-medium text-slate-400">Link to payee (optional)</label>
            <select
              id="payee_id"
              name="payee_id"
              defaultValue={utility.payee_id ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">— None —</option>
              {payees.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="account_number" className="mb-1 block text-xs font-medium text-slate-400">Account number</label>
            <input
              id="account_number"
              name="account_number"
              defaultValue={utility.account_number ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="renewal_date" className="mb-1 block text-xs font-medium text-slate-400">Renewal date</label>
            <input
              id="renewal_date"
              name="renewal_date"
              type="date"
              defaultValue={utility.renewal_date ? utility.renewal_date.toISOString().slice(0, 10) : ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">Notes</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={utility.notes ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Save utility
            </button>
            <Link
              href={`/dashboard/properties/${property.id}`}
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
