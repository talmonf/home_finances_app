"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/src/style.css";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useHouseholdDateFormat } from "@/components/household-preferences-context";
import {
  householdDateInputPlaceholder,
  isoYmdToHouseholdInputDisplay,
  parseHouseholdDateInputToIsoYmd,
} from "@/lib/household-date-format";
import { useUiLanguage } from "@/components/household-preferences-context";

function isIsoYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function localDateToIsoYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoYmdToLocalNoonDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(y, mo - 1, day, 12, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== day) return undefined;
  return dt;
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 2v3M16 2v3M3.5 9h17M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HouseholdDateCalendarLauncher({
  selectedIsoYmd,
  onPick,
  allowEmptyPick,
}: {
  selectedIsoYmd: string;
  onPick: (isoYmd: string) => void;
  allowEmptyPick: boolean;
}) {
  const [open, setOpen] = useState(false);
  const uiLanguage = useUiLanguage();
  const todayLabel = uiLanguage === "he" ? "היום" : "Today";
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const panelW = 280;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - panelW - 8));
    setPos({ top: r.bottom + 8, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedDate = isoYmdToLocalNoonDate(selectedIsoYmd);
  const defaultMonth = selectedDate ?? new Date();

  const portal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[200] rounded-lg border border-slate-600 bg-slate-900 p-2 shadow-2xl"
            style={{ top: pos.top, left: pos.left }}
            role="dialog"
            aria-label="Calendar"
          >
            <DayPicker
              mode="single"
              required={false}
              selected={selectedDate}
              defaultMonth={defaultMonth}
              showOutsideDays
              onSelect={(d) => {
                if (!d) {
                  if (allowEmptyPick) {
                    onPick("");
                    setOpen(false);
                  }
                  return;
                }
                onPick(localDateToIsoYmd(d));
                setOpen(false);
              }}
              className="household-day-picker rounded-md text-sm"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700"
                onClick={() => {
                  onPick(localDateToIsoYmd(new Date()));
                  setOpen(false);
                }}
              >
                {todayLabel}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="inline-flex shrink-0 items-center justify-center self-stretch rounded-lg border border-slate-600 bg-slate-800 px-2.5 text-slate-300 hover:bg-slate-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label="Open calendar"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarIcon />
      </button>
      {portal}
    </>
  );
}

export type HouseholdDateFieldProps = {
  id?: string;
  name: string;
  defaultIsoYmd?: string;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Household-ordered date text + optional calendar popover; submits `yyyy-mm-dd` via a hidden input.
 */
export function HouseholdDateField({
  id,
  name,
  defaultIsoYmd = "",
  required = false,
  className,
  "aria-label": ariaLabel,
}: HouseholdDateFieldProps) {
  const format = useHouseholdDateFormat();
  const rootRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const textRef = useRef("");
  const [text, setText] = useState(() =>
    defaultIsoYmd && isIsoYmd(defaultIsoYmd) ? isoYmdToHouseholdInputDisplay(defaultIsoYmd, format) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const placeholder = useMemo(() => householdDateInputPlaceholder(format), [format]);

  textRef.current = text;

  const syncHidden = useCallback((iso: string) => {
    if (hiddenRef.current) hiddenRef.current.value = iso;
  }, []);

  useEffect(() => {
    const initial = defaultIsoYmd && isIsoYmd(defaultIsoYmd) ? defaultIsoYmd.trim() : "";
    syncHidden(initial);
    setText(initial ? isoYmdToHouseholdInputDisplay(initial, format) : "");
    setError(null);
  }, [defaultIsoYmd, format, syncHidden]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;

    const onSubmitCapture = (e: Event) => {
      const raw = textRef.current;
      const iso = parseHouseholdDateInputToIsoYmd(raw, format);

      if (required && !iso) {
        e.preventDefault();
        setError("Date is required.");
        return;
      }
      if (!required && raw.trim() && !iso) {
        e.preventDefault();
        setError(`Use ${placeholder} (household date order).`);
        return;
      }
      syncHidden(iso ?? "");
      setError(null);
    };

    form.addEventListener("submit", onSubmitCapture, true);
    return () => form.removeEventListener("submit", onSubmitCapture, true);
  }, [format, required, syncHidden, placeholder]);

  const onBlur = () => {
    const raw = text.trim();
    if (!raw) {
      syncHidden("");
      setError(null);
      return;
    }
    const iso = parseHouseholdDateInputToIsoYmd(raw, format);
    if (iso) {
      syncHidden(iso);
      setText(isoYmdToHouseholdInputDisplay(iso, format));
      setError(null);
    } else {
      syncHidden("");
      setError(`Invalid date — use ${placeholder}.`);
    }
  };

  const initialHidden = defaultIsoYmd && isIsoYmd(defaultIsoYmd) ? defaultIsoYmd.trim() : "";

  const pickerSelectedIso =
    text.trim() === "" ? "" : parseHouseholdDateInputToIsoYmd(text.trim(), format) ?? "";

  const onCalendarPick = useCallback(
    (iso: string) => {
      setError(null);
      if (!iso) {
        syncHidden("");
        setText("");
        return;
      }
      syncHidden(iso);
      setText(isoYmdToHouseholdInputDisplay(iso, format));
    },
    [format, syncHidden],
  );

  return (
    <div ref={rootRef} className="space-y-1">
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={initialHidden} />
      <div className="flex w-full min-w-0 items-stretch gap-1.5">
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          required={required}
          value={text}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          onBlur={onBlur}
          className={`min-w-0 flex-1 ${className ?? ""}`}
        />
        <HouseholdDateCalendarLauncher
          selectedIsoYmd={pickerSelectedIso}
          onPick={onCalendarPick}
          allowEmptyPick={!required}
        />
      </div>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}

/** Controlled date segment (ISO `yyyy-mm-dd`) for embedded forms like split date/time. */
export function HouseholdDateIsoControl({
  valueIso,
  onIsoChange,
  required = false,
  className,
  "aria-label": ariaLabel,
}: {
  valueIso: string;
  onIsoChange: (iso: string) => void;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const format = useHouseholdDateFormat();
  const [text, setText] = useState(() => isoYmdToHouseholdInputDisplay(valueIso, format));
  const placeholder = useMemo(() => householdDateInputPlaceholder(format), [format]);

  useEffect(() => {
    setText(isoYmdToHouseholdInputDisplay(valueIso, format));
  }, [valueIso, format]);

  const onCalendarPick = useCallback(
    (iso: string) => {
      if (!iso) {
        onIsoChange("");
        setText("");
        return;
      }
      onIsoChange(iso);
      setText(isoYmdToHouseholdInputDisplay(iso, format));
    },
    [format, onIsoChange],
  );

  const pickerSelectedIso =
    text.trim() === "" ? "" : parseHouseholdDateInputToIsoYmd(text.trim(), format) ?? "";

  return (
    <div className="flex w-full min-w-0 items-stretch gap-1.5">
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        required={required}
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const t = text.trim();
          if (!t) {
            onIsoChange("");
            setText("");
            return;
          }
          const iso = parseHouseholdDateInputToIsoYmd(t, format);
          if (iso) {
            onIsoChange(iso);
            setText(isoYmdToHouseholdInputDisplay(iso, format));
          } else {
            setText(isoYmdToHouseholdInputDisplay(valueIso, format));
          }
        }}
        className={`min-w-0 flex-1 ${className ?? ""}`}
      />
      <HouseholdDateCalendarLauncher
        selectedIsoYmd={pickerSelectedIso}
        onPick={onCalendarPick}
        allowEmptyPick={!required}
      />
    </div>
  );
}
