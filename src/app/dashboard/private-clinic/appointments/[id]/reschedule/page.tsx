import { notFound, redirect } from "next/navigation";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { privateClinicAppointments } from "@/lib/private-clinic-i18n";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import { rescheduleTherapyAppointment } from "../../../actions";
import { dateToDatetimeLocalValue } from "@/lib/household-date-format";
import { DashboardModal } from "@/components/dashboard-modal";
import { RescheduleFormClient } from "./reschedule-form-client";

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/appointments";

type PageProps = { params: Promise<{ id: string }> };

const UPCOMING_VISITS = "/dashboard/private-clinic/upcoming-visits";

export default async function RescheduleAppointmentPage({
  params,
  searchParams,
}: PageProps & { searchParams?: Promise<{ fromUpcoming?: string }> }) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const sp = searchParams ? await searchParams : {};

  const { id } = await params;
  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const uiLanguage = await getCurrentUiLanguage();
  const ap = privateClinicAppointments(uiLanguage);

  const apt = await prisma.therapy_appointments.findFirst({
    where: {
      id,
      household_id: householdId,
      job: jobScope,
    },
    include: { client: true, job: true },
  });

  if (!apt) notFound();

  const fromUpcoming = sp.fromUpcoming === "1";
  const redirectOnSuccess = fromUpcoming ? UPCOMING_VISITS : LIST;
  const startAtLocal = dateToDatetimeLocalValue(apt.start_at);
  const endAtLocal = apt.end_at ? dateToDatetimeLocalValue(apt.end_at) : "";
  const startDate = startAtLocal.slice(0, 10);
  const startTime = startAtLocal.slice(11, 16);
  const endDate = endAtLocal ? endAtLocal.slice(0, 10) : startDate;
  const endTime = endAtLocal ? endAtLocal.slice(11, 16) : "";
  const cancelHref = fromUpcoming
    ? `${LIST}/${apt.id}/cancel?fromUpcoming=1`
    : `${LIST}/${apt.id}/cancel`;

  return (
    <DashboardModal
      title={ap.rescheduleTitle}
      closeHref={redirectOnSuccess}
      closeLabel={fromUpcoming ? ap.backToUpcomingVisits : ap.backToAppointments}
      maxWidthClassName="max-w-xl"
    >
      <p className="mb-4 text-sm text-slate-400">
          {apt.client.first_name} {apt.client.last_name ?? ""}
      </p>
      <RescheduleFormClient
        action={rescheduleTherapyAppointment}
        id={apt.id}
        redirectOnSuccess={redirectOnSuccess}
        cancelHref={cancelHref}
        labels={{
          start: ap.startCol,
          endOptional: ap.endOptional,
          startDate: ap.startDate,
          startTime: ap.startTime,
          durationMinutes: ap.durationMinutesOptional,
          reason: ap.reason,
          notes: ap.notes,
          notesRequiredForOther: ap.notesRequiredForOther,
          therapistRescheduled: ap.therapistRescheduled,
          patientRescheduled: ap.patientRescheduled,
          other: ap.other,
          save: ap.save,
          saving: uiLanguage === "he" ? "שומר..." : "Saving...",
          cancelAppointment: ap.cancelTitle,
          close: ap.cancel,
        }}
        defaults={{
          startDate,
          startTime,
          endDate,
          endTime,
          durationMinutes: apt.duration_minutes ? String(apt.duration_minutes) : "",
        }}
      />
    </DashboardModal>
  );
}
