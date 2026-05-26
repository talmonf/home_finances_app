import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HebrewDateFields } from "@/components/hebrew-date-fields";
import { updateFamilyMarriage } from "../../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function EditFamilyMarriagePage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const isHebrew = (await getCurrentUiLanguage()) === "he";
  const resolved = searchParams ? await searchParams : undefined;

  const [marriage, members] = await Promise.all([
    prisma.family_marriages.findFirst({
      where: { id, household_id: householdId },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  if (!marriage) redirect("/dashboard/family-members/marriages?error=Not+found");

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl ring-1 ring-slate-700">
        <Link href="/dashboard/family-members/marriages" className="text-sm text-slate-400 hover:text-slate-200">
          {isHebrew ? "חזרה →" : "← Back"}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-50">
          {isHebrew ? "עריכת נישואין" : "Edit marriage"}
        </h1>
        {resolved?.error && (
          <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
            {decodeURIComponent(resolved.error.replace(/\+/g, " "))}
          </div>
        )}
        <form action={updateFamilyMarriage} className="space-y-4">
          <input type="hidden" name="id" value={marriage.id} />
          <div>
            <label htmlFor="spouse_a_id" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "בן/בת זוג 1" : "Spouse 1"}
            </label>
            <select
              id="spouse_a_id"
              name="spouse_a_id"
              required
              defaultValue={marriage.spouse_a_id}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="spouse_b_id" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "בן/בת זוג 2" : "Spouse 2"}
            </label>
            <select
              id="spouse_b_id"
              name="spouse_b_id"
              required
              defaultValue={marriage.spouse_b_id}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="wedding_date" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "תאריך נישואין (לועזי)" : "Wedding date (Gregorian)"}
            </label>
            <input
              id="wedding_date"
              name="wedding_date"
              type="date"
              defaultValue={marriage.wedding_date ? marriage.wedding_date.toISOString().slice(0, 10) : ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <HebrewDateFields
            prefix="wedding"
            isHebrew={isHebrew}
            defaultDay={marriage.wedding_hebrew_day}
            defaultMonth={marriage.wedding_hebrew_month}
            defaultYear={marriage.wedding_hebrew_year}
          />
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
