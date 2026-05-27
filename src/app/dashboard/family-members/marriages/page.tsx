import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { formatHebrewDateLabel } from "@/lib/hebrew-calendar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteFamilyMarriage } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ created?: string; updated?: string; deleted?: string; error?: string }>;
};

export default async function FamilyMarriagesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const resolved = searchParams ? await searchParams : undefined;

  const marriages = await prisma.family_marriages.findMany({
    where: { household_id: householdId },
    include: {
      spouse_a: { select: { full_name: true } },
      spouse_b: { select: { full_name: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-screen-2xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/family-members"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה לבני משפחה →" : "← Back to family members"}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-slate-50">
              {isHebrew ? "נישואין" : "Marriages"}
            </h1>
            <Link
              href="/dashboard/family-members/marriages/new"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {isHebrew ? "הוספת רשומת נישואין" : "Add marriage record"}
            </Link>
          </div>
          {resolved?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolved.error.replace(/\+/g, " "))}
            </div>
          )}
        </header>

        {marriages.length === 0 ? (
          <p className="text-sm text-slate-400">
            {isHebrew ? "אין רשומות נישואין עדיין." : "No marriage records yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 bg-slate-800/80 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">{isHebrew ? "בני זוג" : "Couple"}</th>
                  <th className="px-4 py-3">{isHebrew ? "תאריך נישואין" : "Wedding (Gregorian)"}</th>
                  <th className="px-4 py-3">{isHebrew ? "תאריך נישואין עברי" : "Wedding (Hebrew)"}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {marriages.map((m) => {
                  const hebrewLabel =
                    m.wedding_hebrew_day != null && m.wedding_hebrew_month != null
                      ? formatHebrewDateLabel(
                          {
                            day: m.wedding_hebrew_day,
                            month: m.wedding_hebrew_month,
                            year: m.wedding_hebrew_year,
                          },
                          isHebrew ? "he" : "en",
                        )
                      : "—";
                  return (
                    <tr key={m.id} className="border-b border-slate-800">
                      <td className="px-4 py-3 text-slate-100">
                        {m.spouse_a.full_name} & {m.spouse_b.full_name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {m.wedding_date
                          ? formatHouseholdDate(m.wedding_date, dateDisplayFormat)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{hebrewLabel}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/family-members/marriages/${m.id}/edit`}
                          className="text-sky-400 hover:text-sky-300"
                        >
                          {isHebrew ? "עריכה" : "Edit"}
                        </Link>
                        <form action={deleteFamilyMarriage} className="mt-1 inline">
                          <input type="hidden" name="id" value={m.id} />
                          <button
                            type="submit"
                            className="ms-3 text-rose-400 hover:text-rose-300"
                          >
                            {isHebrew ? "מחיקה" : "Delete"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
