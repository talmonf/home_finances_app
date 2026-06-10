import Link from "next/link";
import { openSeriesOccurrence } from "../actions";

type Props = {
  listBase: string;
  labels: {
    edit: string;
    logTreatment: string;
    reschedule: string;
    cancel: string;
  };
  row: {
    kind: "instance" | "virtual";
    id: string | null;
    seriesId: string | null;
    occurrenceDate: string | null;
    treatmentId: string | null;
  };
};

export function AppointmentRowActions({ listBase, labels, row }: Props) {
  if (row.kind === "virtual" && row.seriesId && row.occurrenceDate) {
    const hidden = (
      <>
        <input type="hidden" name="series_id" value={row.seriesId} />
        <input type="hidden" name="occurrence_date" value={row.occurrenceDate} />
      </>
    );
    return (
      <div className="flex flex-wrap items-center gap-2">
        <form action={openSeriesOccurrence} className="inline">
          {hidden}
          <input type="hidden" name="redirect_target" value="edit" />
          <button type="submit" className="text-xs leading-none text-slate-300 hover:text-slate-100">
            {labels.edit}
          </button>
        </form>
        <form action={openSeriesOccurrence} className="inline">
          {hidden}
          <input type="hidden" name="redirect_target" value="report" />
          <button type="submit" className="text-xs leading-none text-emerald-400 hover:text-emerald-300">
            {labels.logTreatment}
          </button>
        </form>
        <form action={openSeriesOccurrence} className="inline">
          {hidden}
          <input type="hidden" name="redirect_target" value="edit" />
          <button type="submit" className="text-xs leading-none text-sky-400 hover:text-sky-300">
            {labels.reschedule}
          </button>
        </form>
        <form action={openSeriesOccurrence} className="inline">
          {hidden}
          <input type="hidden" name="redirect_target" value="cancel" />
          <button type="submit" className="text-xs leading-none text-rose-400 hover:text-rose-300">
            {labels.cancel}
          </button>
        </form>
      </div>
    );
  }

  if (!row.id) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`${listBase}/${row.id}/edit`}
        className="inline-flex items-center text-xs leading-none text-slate-300 hover:text-slate-100"
      >
        {labels.edit}
      </Link>
      {row.treatmentId ? (
        <span className="inline-flex items-center text-xs leading-none text-emerald-400/80">
          {labels.logTreatment}
        </span>
      ) : (
        <Link
          href={`${listBase}/${row.id}/edit#report-treatment`}
          className="inline-flex items-center text-xs leading-none text-emerald-400 hover:text-emerald-300"
        >
          {labels.logTreatment}
        </Link>
      )}
      <Link
        href={`${listBase}/${row.id}/reschedule`}
        className="inline-flex items-center text-xs leading-none text-sky-400 hover:text-sky-300"
      >
        {labels.reschedule}
      </Link>
      <Link
        href={`${listBase}/${row.id}/cancel`}
        className="inline-flex items-center text-xs leading-none text-rose-400 hover:text-rose-300"
      >
        {labels.cancel}
      </Link>
    </div>
  );
}
