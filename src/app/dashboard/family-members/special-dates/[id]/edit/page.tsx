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
import { updateFamilySpecialDate } from "../../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function EditFamilySpecialDatePage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const isHebrew = (await getCurrentUiLanguage()) === "he";
  const resolved = searchParams ? await searchParams : undefined;

  const [record, members] = await Promise.all([
    prisma.family_special_dates.findFirst({
      where: { id, household_id: householdId },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  if (!record) redirect("/dashboard/family-members/special-dates?error=Not+found");

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
          {isHebrew ? "עריכת מועד מיוחד" : "Edit special date"}
        </h1>
        {resolved?.error && (
          <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
            {decodeURIComponent(resolved.error.replace(/\+/g, " "))}
          </div>
        )}
        <form action={updateFamilySpecialDate} className="space-y-4">
          <input type="hidden" name="id" value={record.id} />
          <SpecialDatePersonTypeFields
            isHebrew={isHebrew}
            members={members}
            defaultFamilyMemberId={record.family_member_id}
            defaultDisplayName={record.display_name}
            defaultEventType={record.event_type}
            defaultEventTypeOther={record.event_type_other}
          />
          <SpecialDateFields
            isHebrew={isHebrew}
            formKind="edit"
            hebrewPersistedInDb={record.hebrew_day != null && record.hebrew_month != null}
            defaultGregorian={
              record.gregorian_date ? record.gregorian_date.toISOString().slice(0, 10) : ""
            }
            defaultHebrewDay={record.hebrew_day}
            defaultHebrewMonth={record.hebrew_month}
            defaultHebrewYear={record.hebrew_year}
          />
          <div>
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "הערות (אופציונלי)" : "Notes (optional)"}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={record.notes ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-500 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {isHebrew ? "שמירת שינויים" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
