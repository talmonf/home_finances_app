import { prisma, requireHouseholdAdmin, getAuthSession } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HOUSEHOLD_DATE_FORMAT_LABELS } from "@/lib/household-date-format";
import { updateHouseholdDateDisplayFormat } from "./actions";

export const dynamic = "force-dynamic";

export default async function HouseholdSettingsPage() {
  await requireHouseholdAdmin();
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (!householdId || session.user.isSuperAdmin) redirect("/");

  const household = await prisma.households.findUnique({
    where: { id: householdId },
    select: { name: true, date_display_format: true },
  });
  if (!household) redirect("/");

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <Link href="/dashboard/family-members" className="inline-block text-sm text-slate-400 hover:text-slate-200">
            ← Back to family members
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Household settings</h1>
          <p className="text-sm text-slate-400">
            {household.name} — preferences for everyone in this household.
          </p>
        </header>

        <form action={updateHouseholdDateDisplayFormat} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="space-y-2">
            <label htmlFor="date_display_format" className="block text-sm font-medium text-slate-300">
              Date display format
            </label>
            <p className="text-xs text-slate-500">
              Used for dates shown in lists and tables. Native date fields also follow this order when your browser
              respects the page language (en-CA / en-GB / en-US).
            </p>
            <select
              id="date_display_format"
              name="date_display_format"
              defaultValue={household.date_display_format}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {(["YMD", "DMY", "MDY"] as const).map((value) => (
                <option key={value} value={value}>
                  {HOUSEHOLD_DATE_FORMAT_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
