import {
  getCurrentHouseholdDateDisplayFormat,
  getCurrentHouseholdId,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
  prisma,
  requireHouseholdMember,
} from "@/lib/auth";
import { loadCalendarEvents, enabledSectionIdSet } from "@/lib/calendar/load-events";
import {
  calendarHref,
  calendarKindsForModules,
  daysForView,
  isCurrentCalendarPeriod,
  parseAnchorDate,
  parseCalendarView,
  rangeIncludesDate,
  shiftAnchor,
  isoDateLocal,
  type CalendarView,
} from "@/lib/calendar/model";
import { calendarIntro, calendarStrings } from "@/lib/calendar/strings";
import { formatIsoDateStringForHousehold } from "@/lib/household-date-format";
import { getEffectiveEnabledSections, getHouseholdModuleFlags } from "@/lib/household-sections";
import { redirect } from "next/navigation";
import { CalendarBoard } from "./calendar-view";

export const dynamic = "force-dynamic";

function weekdayLabels(language: "en" | "he"): string[] {
  const fmt = new Intl.DateTimeFormat(language === "he" ? "he-IL" : "en-GB", { weekday: "short" });
  const sunday = new Date(2026, 9, 4);
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)));
}

function periodLabel(
  view: CalendarView,
  anchor: Date,
  days: Date[],
  language: "en" | "he",
  dateFormat: Awaited<ReturnType<typeof getCurrentHouseholdDateDisplayFormat>>,
): string {
  if (view === "month") {
    return new Intl.DateTimeFormat(language === "he" ? "he-IL" : "en-GB", {
      month: "long",
      year: "numeric",
    }).format(anchor);
  }
  if (view === "week") {
    const start = days[0]!;
    const end = days[days.length - 1]!;
    return `${formatIsoDateStringForHousehold(isoDateLocal(start), dateFormat)} – ${formatIsoDateStringForHousehold(isoDateLocal(end), dateFormat)}`;
  }
  return formatIsoDateStringForHousehold(isoDateLocal(anchor), dateFormat);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; date?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const sp = searchParams ? await searchParams : {};
  const uiLanguage = await getCurrentUiLanguage();
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const obfuscate = await getCurrentObfuscateSensitive();
  const userId = session.user.id;

  const today = new Date();
  const view = parseCalendarView(sp.view);
  const anchor = parseAnchorDate(sp.date, today);
  const days = daysForView(view, anchor);

  const user = await prisma.users.findFirst({
    where: { id: userId, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const sections = await getEffectiveEnabledSections({ householdId, userId });
  const moduleFlags = getHouseholdModuleFlags(sections);
  const introScope =
    moduleFlags.clinicEnabled && moduleFlags.householdEnabled
      ? "both"
      : moduleFlags.clinicEnabled
        ? "clinic"
        : "home";
  const copy = {
    ...calendarStrings(uiLanguage),
    intro: moduleFlags.clinicEnabled || moduleFlags.householdEnabled ? calendarIntro(uiLanguage, introScope) : "",
  };
  const kinds = calendarKindsForModules(moduleFlags);
  const events = await loadCalendarEvents({
    householdId,
    familyMemberId: user?.family_member_id ?? null,
    rangeStart: days[0]!,
    rangeEnd: days[days.length - 1]!,
    visibleDays: days,
    today,
    language: uiLanguage,
    dateDisplayFormat,
    obfuscate,
    enabledSectionIds: enabledSectionIdSet(sections),
  });

  const viewHrefs = {
    day: calendarHref("day", anchor),
    week: calendarHref("week", anchor),
    month: calendarHref("month", anchor),
  } as const;

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-screen-2xl">
        <CalendarBoard
          copy={copy}
          kinds={kinds}
          view={view}
          anchorIso={isoDateLocal(anchor)}
          periodLabel={periodLabel(view, anchor, days, uiLanguage, dateDisplayFormat)}
          prevHref={calendarHref(view, shiftAnchor(view, anchor, -1))}
          nextHref={calendarHref(view, shiftAnchor(view, anchor, 1))}
          todayHref={calendarHref(view, today)}
          showingCurrentPeriod={isCurrentCalendarPeriod(view, anchor, today)}
          viewHrefs={viewHrefs}
          weekdayLabels={weekdayLabels(uiLanguage)}
          showOverdueStrip={rangeIncludesDate(days, today)}
          days={days.map((day) => ({
            iso: isoDateLocal(day),
            label: view === "month" ? String(day.getDate()) : formatIsoDateStringForHousehold(isoDateLocal(day), dateDisplayFormat),
            inMonth: view !== "month" || day.getMonth() === anchor.getMonth(),
            isToday: isoDateLocal(day) === isoDateLocal(today),
          }))}
          events={events}
        />
      </div>
    </div>
  );
}
