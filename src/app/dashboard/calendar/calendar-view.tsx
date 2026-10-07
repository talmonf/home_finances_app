"use client";

import { HouseholdDateIsoControl } from "@/components/household-date-field";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  calendarHref,
  hourWindow,
  type CalendarEvent,
  type CalendarEventKind,
  type CalendarView,
} from "@/lib/calendar/model";
import type { CalendarCopy } from "@/lib/calendar/strings";
import { openSeriesOccurrence } from "@/app/dashboard/private-clinic/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

const KIND_CLASS: Record<CalendarEvent["kind"], string> = {
  clinicAppointment: "border-sky-400/50 bg-sky-500/20 text-sky-50",
  clinicConsultation: "border-teal-400/50 bg-teal-500/20 text-teal-50",
  clinicVisit: "border-violet-400/50 bg-violet-500/20 text-violet-50",
  familyDate: "border-amber-400/50 bg-amber-500/20 text-amber-50",
  medical: "border-rose-400/50 bg-rose-500/20 text-rose-50",
  task: "border-emerald-400/50 bg-emerald-500/20 text-emerald-50",
  renewal: "border-lime-400/40 bg-lime-500/15 text-lime-50",
};

type DayCell = {
  iso: string;
  label: string;
  inMonth: boolean;
  isToday: boolean;
};

type Props = {
  copy: CalendarCopy;
  kinds: CalendarEventKind[];
  view: CalendarView;
  anchorIso: string;
  periodLabel: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  showingCurrentPeriod: boolean;
  viewHrefs: Record<CalendarView, string>;
  days: DayCell[];
  weekdayLabels: string[];
  events: CalendarEvent[];
  showOverdueStrip: boolean;
};

function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type PeriodNavKey = "prev" | "current" | "next";

function PeriodNavControl({
  href,
  label,
  title,
  navKey,
  pendingNav,
  onNavigate,
  disabled = false,
}: {
  href: string;
  label: string;
  title?: string;
  navKey: PeriodNavKey;
  pendingNav: PeriodNavKey | null;
  onNavigate: (key: PeriodNavKey, href: string) => void;
  disabled?: boolean;
}) {
  const className =
    "inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-slate-700 hover:bg-slate-700";
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        title={title}
        className="inline-flex cursor-default items-center rounded-lg bg-slate-800/40 px-3 py-1.5 text-sm text-slate-500 ring-1 ring-slate-800"
      >
        {label}
      </span>
    );
  }
  const pending = pendingNav === navKey;
  return (
    <Link
      href={href}
      title={title}
      aria-busy={pending}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        onNavigate(navKey, href);
      }}
      className={className}
    >
      {pending ? <LoadingSpinner className="h-3.5 w-3.5" /> : null}
      {label}
    </Link>
  );
}

function chipLabel(event: CalendarEvent): string {
  if (event.startMinutes == null) return event.title;
  return `${formatClock(event.startMinutes)} ${event.title}`;
}

export function CalendarBoard(props: Props) {
  const router = useRouter();
  const [pendingNav, setPendingNav] = useState<PeriodNavKey | null>(null);
  const [isNavPending, startNavTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hiddenKinds, setHiddenKinds] = useState<CalendarEventKind[]>([]);
  const [jumpIso, setJumpIso] = useState(props.anchorIso);
  useEffect(() => {
    setJumpIso(props.anchorIso);
  }, [props.anchorIso]);
  useEffect(() => {
    if (!isNavPending) setPendingNav(null);
  }, [isNavPending]);

  function navigatePeriod(key: PeriodNavKey, href: string) {
    setPendingNav(key);
    startNavTransition(() => {
      router.push(href);
    });
  }
  const hidden = useMemo(() => new Set(hiddenKinds), [hiddenKinds]);
  const shownEvents = useMemo(
    () => props.events.filter((event) => !hidden.has(event.kind)),
    [props.events, hidden],
  );
  const selected = shownEvents.find((event) => event.id === selectedId) ?? null;
  const dayIsos = useMemo(() => new Set(props.days.map((day) => day.iso)), [props.days]);
  const visibleEvents = shownEvents.filter((event) => dayIsos.has(event.date));
  const overdue = props.showOverdueStrip
    ? shownEvents.filter((event) => event.kind === "clinicVisit" && event.overdue)
    : [];

  function toggleKind(kind: CalendarEventKind) {
    setHiddenKinds((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
    );
    if (selected?.kind === kind && !hidden.has(kind)) setSelectedId(null);
  }

  return (
    <div className="space-y-4" data-testid="calendar-board">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">{props.copy.title}</h1>
          {props.copy.intro ? (
            <p className="mt-1 max-w-3xl text-sm text-slate-400">{props.copy.intro}</p>
          ) : null}
        </div>
        <div className="w-full max-w-xs">
          <label htmlFor="calendar-jump" className="mb-1 block text-xs text-slate-400">
            {props.copy.jumpToDate}
          </label>
          <HouseholdDateIsoControl
            id="calendar-jump"
            valueIso={jumpIso}
            onIsoChange={(iso) => {
              setJumpIso(iso);
              if (iso) router.push(calendarHref(props.view, parseIso(iso)));
            }}
            aria-label={props.copy.jumpToDate}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodNavControl
            href={props.prevHref}
            label={props.copy.previous}
            navKey="prev"
            pendingNav={isNavPending ? pendingNav : null}
            onNavigate={navigatePeriod}
          />
          <PeriodNavControl
            href={props.todayHref}
            label={props.copy.today}
            title={props.copy.todayHint}
            navKey="current"
            pendingNav={isNavPending ? pendingNav : null}
            onNavigate={navigatePeriod}
            disabled={props.showingCurrentPeriod}
          />
          <PeriodNavControl
            href={props.nextHref}
            label={props.copy.next}
            navKey="next"
            pendingNav={isNavPending ? pendingNav : null}
            onNavigate={navigatePeriod}
          />
          <h2 className="px-1 text-base font-medium text-slate-100">{props.periodLabel}</h2>
        </div>
        <div className="flex rounded-lg bg-slate-900 p-1 ring-1 ring-slate-700" role="group" aria-label={props.copy.title}>
          {(["day", "week", "month"] as const).map((view) => (
            <Link
              key={view}
              href={props.viewHrefs[view]}
              aria-current={props.view === view ? "page" : undefined}
              className={
                props.view === view
                  ? "rounded-md bg-sky-500/20 px-3 py-1.5 text-sm text-sky-100"
                  : "rounded-md px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100"
              }
            >
              {props.copy[view]}
            </Link>
          ))}
        </div>
      </div>

      {props.kinds.length > 0 ? (
        <ul className="flex flex-wrap gap-2 text-[11px] text-slate-300">
          {props.kinds.map((kind) => {
            const shown = !hidden.has(kind);
            return (
              <li key={kind}>
                <button
                  type="button"
                  aria-pressed={shown}
                  onClick={() => toggleKind(kind)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                    shown ? KIND_CLASS[kind] : "border-slate-600 bg-transparent text-slate-500"
                  }`}
                >
                  {shown ? <span aria-hidden="true">✓</span> : null}
                  {props.copy.kinds[kind]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selected ? (
        <EventDetail copy={props.copy} event={selected} onClose={() => setSelectedId(null)} />
      ) : null}

      {overdue.length > 0 ? (
        <section className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-3">
          <h3 className="text-sm font-medium text-violet-100">{props.copy.overdueTitle}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {overdue.map((event) => (
              <button
                key={event.id}
                type="button"
                title={event.hover ?? event.title}
                onClick={() => setSelectedId(event.id)}
                className={`rounded border px-2 py-1 text-xs ${KIND_CLASS.clinicVisit}`}
              >
                {event.title}
                {event.subtitle ? <span className="ms-1 text-violet-200/80">{event.subtitle}</span> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {props.view === "month" ? (
        <MonthGrid
          copy={props.copy}
          days={props.days}
          weekdayLabels={props.weekdayLabels}
          events={visibleEvents}
          onSelect={setSelectedId}
        />
      ) : (
        <TimeGrid
          copy={props.copy}
          days={props.days}
          events={visibleEvents}
          onSelect={setSelectedId}
        />
      )}

      {visibleEvents.length === 0 && overdue.length === 0 ? (
        <p className="text-sm text-slate-400">{props.copy.empty}</p>
      ) : null}
    </div>
  );
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d);
}

function EventChip({
  event,
  onSelect,
}: {
  event: CalendarEvent;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      title={event.hover ?? event.subtitle ?? event.title}
      onClick={() => onSelect(event.id)}
      className={`block w-full truncate rounded border px-1 py-0.5 text-start text-[11px] leading-4 ${KIND_CLASS[event.kind]}`}
    >
      {chipLabel(event)}
    </button>
  );
}

function MonthGrid({
  copy,
  days,
  weekdayLabels,
  events,
  onSelect,
}: {
  copy: CalendarCopy;
  days: DayCell[];
  weekdayLabels: string[];
  events: CalendarEvent[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto" data-testid="calendar-month">
      <div className="grid min-w-[44rem] grid-cols-7 border border-slate-800">
        {weekdayLabels.map((label) => (
          <div key={label} className="border-b border-slate-800 bg-slate-900/80 px-2 py-1 text-xs font-medium text-slate-400">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const dayEvents = events.filter((event) => event.date === day.iso);
          const shown = dayEvents.slice(0, 3);
          const extra = dayEvents.length - shown.length;
          return (
            <div
              key={day.iso}
              className={`min-h-28 border-b border-s border-slate-800 p-1 ${
                day.isToday ? "bg-sky-500/10" : day.inMonth ? "bg-slate-950" : "bg-slate-900/40"
              }`}
            >
              <div className={`mb-1 text-xs ${day.inMonth ? "text-slate-200" : "text-slate-500"}`}>
                {day.label}
              </div>
              <div className="space-y-1">
                {shown.map((event) => (
                  <EventChip key={event.id} event={event} onSelect={onSelect} />
                ))}
                {extra > 0 ? (
                  <Link href={calendarHref("day", parseIso(day.iso))} className="block text-[11px] text-sky-300 hover:text-sky-200">
                    {copy.more.replace("{n}", String(extra))}
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeGrid({
  copy,
  days,
  events,
  onSelect,
}: {
  copy: CalendarCopy;
  days: DayCell[];
  events: CalendarEvent[];
  onSelect: (id: string) => void;
}) {
  const { startHour, endHour } = hourWindow(events);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const rowHeight = 48;
  const totalHeight = hours.length * rowHeight;
  const spanMinutes = (endHour - startHour) * 60;

  return (
    <div className="overflow-x-auto" data-testid="calendar-time">
      <div
        className="grid min-w-[44rem] border border-slate-800"
        style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(8rem, 1fr))` }}
      >
        <div className="border-b border-slate-800 px-1 py-2 text-[10px] text-slate-500">{copy.allDay}</div>
        {days.map((day) => (
          <div
            key={`${day.iso}-all`}
            className={`space-y-1 border-b border-s border-slate-800 p-1 ${day.isToday ? "bg-sky-500/10" : ""}`}
          >
            <div className="text-xs font-medium text-slate-200">{day.label}</div>
            {events
              .filter((event) => event.date === day.iso && event.startMinutes == null)
              .map((event) => (
                <EventChip key={event.id} event={event} onSelect={onSelect} />
              ))}
          </div>
        ))}
        <div className="relative border-slate-800" style={{ height: totalHeight }}>
          {hours.map((hour, index) => (
            <div
              key={hour}
              className="absolute inset-x-0 border-t border-slate-800 px-1 text-[10px] text-slate-500"
              style={{ top: index * rowHeight, height: rowHeight }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {days.map((day) => (
          <div
            key={`${day.iso}-time`}
            className={`relative border-s border-slate-800 ${day.isToday ? "bg-sky-500/5" : ""}`}
            style={{ height: totalHeight }}
          >
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-slate-800/80"
                style={{ top: index * rowHeight, height: rowHeight }}
              />
            ))}
            {events
              .filter((event) => event.date === day.iso && event.startMinutes != null)
              .map((event) => {
                const start = event.startMinutes ?? startHour * 60;
                const end = event.endMinutes ?? start + 60;
                const top = ((start - startHour * 60) / spanMinutes) * totalHeight;
                const height = Math.max(((end - start) / spanMinutes) * totalHeight, 20);
                return (
                  <button
                    key={event.id}
                    type="button"
                    title={event.hover ?? event.subtitle ?? event.title}
                    onClick={() => onSelect(event.id)}
                    className={`absolute inset-x-0.5 overflow-hidden rounded border px-1 text-start text-[11px] leading-4 ${KIND_CLASS[event.kind]}`}
                    style={{ top, height }}
                  >
                    {chipLabel(event)}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventDetail({
  copy,
  event,
  onClose,
}: {
  copy: CalendarCopy;
  event: CalendarEvent;
  onClose: () => void;
}) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{copy.kinds[event.kind]}</p>
          <h3 className="text-lg font-medium text-slate-50">{event.title}</h3>
          {event.subtitle ? <p className="text-sm text-slate-300">{event.subtitle}</p> : null}
          {event.hover ? <p className="mt-1 text-sm text-slate-300">{event.hover}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200">
          {copy.close}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {event.action?.kind === "visit" ? (
          <>
            <Link href={event.action.scheduleHref} className="font-medium text-sky-400 hover:text-sky-300">
              {copy.scheduleAppointment}
            </Link>
            <Link href={event.action.logTreatmentHref} className="font-medium text-sky-400 hover:text-sky-300">
              {copy.logTreatment}
            </Link>
          </>
        ) : null}
        {event.action?.kind === "appointment" && event.action.rescheduleHref ? (
          <Link href={event.action.rescheduleHref} className="font-medium text-sky-400 hover:text-sky-300">
            {copy.reschedule}
          </Link>
        ) : null}
        {event.action?.kind === "appointment" && event.action.reportHref ? (
          <Link href={event.action.reportHref} className="font-medium text-sky-400 hover:text-sky-300">
            {copy.reportTreatment}
          </Link>
        ) : null}
        {event.action?.kind === "consultation" ? (
          <>
            <Link href={event.action.rescheduleHref} className="font-medium text-sky-400 hover:text-sky-300">
              {copy.rescheduleConsultation}
            </Link>
            <Link href={event.action.reportHref} className="font-medium text-sky-400 hover:text-sky-300">
              {copy.reportConsultation}
            </Link>
            <Link href={event.action.cancelHref} className="font-medium text-rose-300 hover:text-rose-200">
              {copy.cancelConsultation}
            </Link>
          </>
        ) : null}
        {event.action?.kind === "appointment" && event.action.seriesId && event.action.occurrenceDate ? (
          <>
            <SeriesForm
              seriesId={event.action.seriesId}
              occurrenceDate={event.action.occurrenceDate}
              target="reschedule"
              label={copy.reschedule}
            />
            <SeriesForm
              seriesId={event.action.seriesId}
              occurrenceDate={event.action.occurrenceDate}
              target="report"
              label={copy.reportTreatment}
            />
          </>
        ) : null}
        {event.href ? (
          <Link href={event.href} className="font-medium text-slate-300 hover:text-slate-100">
            {copy.open}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function SeriesForm({
  seriesId,
  occurrenceDate,
  target,
  label,
}: {
  seriesId: string;
  occurrenceDate: string;
  target: "reschedule" | "report";
  label: string;
}) {
  return (
    <form action={openSeriesOccurrence}>
      <input type="hidden" name="series_id" value={seriesId} />
      <input type="hidden" name="occurrence_date" value={occurrenceDate} />
      <input type="hidden" name="from_calendar" value="1" />
      <input type="hidden" name="redirect_target" value={target} />
      <button type="submit" className="font-medium text-sky-400 hover:text-sky-300">
        {label}
      </button>
    </form>
  );
}
