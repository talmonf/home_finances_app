import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import {
  resolveSpecialDateDisplayName,
  resolveSpecialDateEventTypeLabel,
} from "@/lib/family-special-dates/event-type-labels";
import { formatHebrewDateLabel } from "@/lib/hebrew-calendar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteFamilySpecialDate } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ created?: string; updated?: string; deleted?: string; error?: string }>;
};

export default async function FamilySpecialDatesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const language = isHebrew ? "he" : "en";
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const resolved = searchParams ? await searchParams : undefined;

  const specialDates = await prisma.family_special_dates.findMany({
    where: { household_id: householdId },
    include: {
      family_member: { select: { full_name: true } },
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
              {isHebrew ? "מועדים מיוחדים" : "Special dates"}
            </h1>
            <Link
              href="/dashboard/family-members/special-dates/new"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {isHebrew ? "הוספת מועד מיוחד" : "Add special date"}
            </Link>
          </div>
          {(resolved?.created || resolved?.updated || resolved?.deleted || resolved?.error) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolved.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/60 text-emerald-100"
              }`}
            >
              {resolved.error
                ? decodeURIComponent(resolved.error.replace(/\+/g, " "))
                : resolved.created
                  ? isHebrew
                    ? "המועד נוסף."
                    : "Special date added."
                  : resolved.updated
                    ? isHebrew
                      ? "המועד עודכן."
                      : "Special date updated."
                    : isHebrew
                      ? "המועד נמחק."
                      : "Special date deleted."}
            </div>
          )}
        </header>

        {specialDates.length === 0 ? (
          <p className="text-sm text-slate-400">
            {isHebrew ? "אין מועדים מיוחדים עדיין." : "No special dates yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 bg-slate-800/80 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">{isHebrew ? "אדם" : "Person"}</th>
                  <th className="px-4 py-3">{isHebrew ? "סוג" : "Type"}</th>
                  <th className="px-4 py-3">{isHebrew ? "לועזי" : "Gregorian"}</th>
                  <th className="px-4 py-3">{isHebrew ? "עברי" : "Hebrew"}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {specialDates.map((record) => {
                  const personName = resolveSpecialDateDisplayName({
                    display_name: record.display_name,
                    family_member: record.family_member,
                  });
                  const eventTypeLabel = resolveSpecialDateEventTypeLabel({
                    event_type: record.event_type,
                    event_type_other: record.event_type_other,
                    language,
                  });
                  const hebrewLabel =
                    record.hebrew_day != null && record.hebrew_month != null
                      ? formatHebrewDateLabel(
                          {
                            day: record.hebrew_day,
                            month: record.hebrew_month,
                            year: record.hebrew_year,
                          },
                          language,
                        )
                      : "—";

                  return (
                    <tr key={record.id} className="border-b border-slate-800">
                      <td className="px-4 py-3 text-slate-100">{personName}</td>
                      <td className="px-4 py-3 text-slate-300">{eventTypeLabel}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {record.gregorian_date
                          ? formatHouseholdDate(record.gregorian_date, dateDisplayFormat)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{hebrewLabel}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/family-members/special-dates/${record.id}/edit`}
                          className="text-sky-400 hover:text-sky-300"
                        >
                          {isHebrew ? "עריכה" : "Edit"}
                        </Link>
                        <form action={deleteFamilySpecialDate} className="mt-1 inline">
                          <input type="hidden" name="id" value={record.id} />
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
