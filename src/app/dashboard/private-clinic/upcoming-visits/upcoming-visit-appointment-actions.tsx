import Link from "next/link";
import { openSeriesOccurrence } from "../actions";

type NextAppointmentRef = {
  id: string | null;
  seriesId: string | null;
  occurrenceDate: string | null;
};

type Props = {
  nextAppointment: NextAppointmentRef | null;
  scheduleAppointmentHref: string;
  scheduleAppointmentLabel: string;
  rescheduleLabel: string;
  cancelLabel: string;
};

export function UpcomingVisitAppointmentActions({
  nextAppointment,
  scheduleAppointmentHref,
  scheduleAppointmentLabel,
  rescheduleLabel,
  cancelLabel,
}: Props) {
  if (!nextAppointment) {
    return (
      <Link href={scheduleAppointmentHref} className="font-medium text-sky-400 hover:text-sky-300">
        {scheduleAppointmentLabel}
      </Link>
    );
  }

  if (nextAppointment.id) {
    const id = encodeURIComponent(nextAppointment.id);
    return (
      <>
        <Link
          href={`/dashboard/private-clinic/appointments/${id}/reschedule?fromUpcoming=1`}
          className="font-medium text-sky-400 hover:text-sky-300"
        >
          {rescheduleLabel}
        </Link>
        {" · "}
        <Link
          href={`/dashboard/private-clinic/appointments/${id}/cancel?fromUpcoming=1`}
          className="font-medium text-rose-400 hover:text-rose-300"
        >
          {cancelLabel}
        </Link>
      </>
    );
  }

  if (nextAppointment.seriesId && nextAppointment.occurrenceDate) {
    const hidden = (
      <>
        <input type="hidden" name="series_id" value={nextAppointment.seriesId} />
        <input type="hidden" name="occurrence_date" value={nextAppointment.occurrenceDate} />
      </>
    );
    return (
      <>
        <form action={openSeriesOccurrence} className="inline">
          {hidden}
          <input type="hidden" name="from_upcoming" value="1" />
          <input type="hidden" name="redirect_target" value="reschedule" />
          <button type="submit" className="font-medium text-sky-400 hover:text-sky-300">
            {rescheduleLabel}
          </button>
        </form>
        {" · "}
        <form action={openSeriesOccurrence} className="inline">
          {hidden}
          <input type="hidden" name="from_upcoming" value="1" />
          <input type="hidden" name="redirect_target" value="cancel" />
          <button type="submit" className="font-medium text-rose-400 hover:text-rose-300">
            {cancelLabel}
          </button>
        </form>
      </>
    );
  }

  return null;
}
