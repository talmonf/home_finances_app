import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateIdentity } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; updated?: string }>;
};

const IDENTITY_TYPE_LABELS: Record<string, string> = {
  passport: "Passport",
  national_id: "National ID",
  driver_license: "Driver license",
  car_license: "Car license",
  other: "Other",
};

function formatDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function EditIdentityPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [identity, familyMembers] = await Promise.all([
    prisma.identities.findFirst({
      where: { id, household_id: householdId },
      include: { family_member: true },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  if (!identity) {
    redirect("/dashboard/identities?error=Not+found");
  }

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-3xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/identities"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to identities
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Edit identity</h1>
          <p className="text-sm text-slate-400">
            Update expiry details for this identity item.
          </p>
          {(resolvedSearchParams?.error || resolvedSearchParams?.updated) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolvedSearchParams.error
                ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                : "Identity updated."}
            </div>
          )}
        </header>

        <form
          action={updateIdentity}
          className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
        >
          <input type="hidden" name="id" value={identity.id} />

          <div>
            <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
              Family member
            </label>
            <select
              id="family_member_id"
              name="family_member_id"
              defaultValue={identity.family_member_id}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="identity_type" className="mb-1 block text-xs font-medium text-slate-400">
              Type
            </label>
            <select
              id="identity_type"
              name="identity_type"
              defaultValue={identity.identity_type}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {Object.entries(IDENTITY_TYPE_LABELS)
                .filter(([value]) => value !== "car_license" || identity.identity_type === "car_license")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="identity_type_other"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Other type (specify)
            </label>
            <input
              id="identity_type_other"
              name="identity_type_other"
              defaultValue={identity.identity_type_other ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="Only required when Type is Other"
            />
          </div>

          <div>
            <label htmlFor="identifier" className="mb-1 block text-xs font-medium text-slate-400">
              Identifier (optional)
            </label>
            <input
              id="identifier"
              name="identifier"
              defaultValue={identity.identifier ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
              Notes (optional)
            </label>
            <input
              id="notes"
              name="notes"
              defaultValue={identity.notes ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="Optional notes"
            />
          </div>

          <div>
            <label htmlFor="expiry_date" className="mb-1 block text-xs font-medium text-slate-400">
              Expiry date
            </label>
            <input
              id="expiry_date"
              name="expiry_date"
              type="date"
              defaultValue={formatDateInput(identity.expiry_date)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/dashboard/identities"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

