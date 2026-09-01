"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { postPrivateClinicUsageAction } from "@/lib/usage-audit/track-client";
import {
  upcomingVisitLogTreatmentTarget,
  type UpcomingVisitAppointmentRef,
} from "@/lib/therapy/log-treatment";
import { openSeriesOccurrence } from "../actions";

type Props = {
  label: string;
  clientId: string;
  nextAppointment?: UpcomingVisitAppointmentRef | null;
};

export function LogTreatmentLink({ label, clientId, nextAppointment }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const target = upcomingVisitLogTreatmentTarget(clientId, nextAppointment ?? null);

  const trackAndPush = (href: string, appointmentId?: string) => {
    postPrivateClinicUsageAction("upcomingVisits", "open_log_treatment", {
      client_id: clientId,
      ...(appointmentId ? { appointment_id: appointmentId } : {}),
    });
    startTransition(() => {
      router.push(href);
    });
  };

  if (target.kind === "series-occurrence") {
    return (
      <form
        action={openSeriesOccurrence}
        className="inline"
        onSubmit={() => {
          postPrivateClinicUsageAction("upcomingVisits", "open_log_treatment", {
            client_id: clientId,
          });
        }}
      >
        <input type="hidden" name="series_id" value={target.seriesId} />
        <input type="hidden" name="occurrence_date" value={target.occurrenceDate} />
        <input type="hidden" name="from_upcoming" value="1" />
        <input type="hidden" name="redirect_target" value="report" />
        <button
          type="submit"
          className="font-medium text-sky-400 hover:text-sky-300"
        >
          {label}
        </button>
      </form>
    );
  }

  const appointmentId = target.kind === "appointment" ? target.appointmentId : undefined;

  return (
    <Link
      href={target.href}
      aria-busy={isPending}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        trackAndPush(target.href, appointmentId);
      }}
      className={`font-medium text-sky-400 hover:text-sky-300 ${isPending ? "opacity-60" : ""}`}
    >
      {label}
    </Link>
  );
}
