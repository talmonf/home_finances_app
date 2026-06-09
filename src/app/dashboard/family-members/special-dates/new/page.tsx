import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SpecialDateFields } from "@/components/special-date-fields";
import { SpecialDatePersonTypeFields } from "@/components/special-date-person-type-fields";
import { createFamilySpecialDate } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function NewFamilySpecialDatePage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const isHebrew = (await getCurrentUiLanguage()) === "he";
  const resolved = searchParams ? await searchParams : undefined;

  const members = await prisma.family_members.findMany({
    where: { household_id: householdId, is_active: true },
    orderBy: { full_name: "asc" },
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl ring-1 ring-slate-700">
        <Link
          href="/dashboard/family-members/special-dates"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          {isHebrew ? "חזרה →" : "← Back"}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-50">
          {isHebrew ? "הוספת מועד מיוחד" : "Add special date"}
        </h1>
        {resolved?.error && (
          <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
            {decodeURIComponent(resolved.error.replace(/\+/g, " "))}
          </div>
        )}
        <form action={createFamilySpecialDate} className="space-y-4">
          <SpecialDatePersonTypeFields isHebrew={isHebrew} members={members} />
          <SpecialDateFields isHebrew={isHebrew} formKind="create" hebrewPersistedInDb={false} />
          <div>
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "הערות (אופציונלי)" : "Notes (optional)"}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-500 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {isHebrew ? "שמירה" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
