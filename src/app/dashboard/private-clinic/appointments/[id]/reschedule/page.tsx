import Link from "next/link";
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

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/appointments";

type PageProps = { params: Promise<{ id: string }> };

export default async function RescheduleAppointmentPage({ params }: PageProps) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

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

  const redirectOnSuccess = `${LIST}/${id}/edit?rescheduled=1`;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`${LIST}/${id}/edit`} className="text-sm text-slate-400 hover:text-slate-200">
          ← {ap.editTitle}
        </Link>
        <h2 className="mt-2 text-lg font-medium text-slate-200">{ap.rescheduleTitle}</h2>
        <p className="text-sm text-slate-400">
          {apt.client.first_name} {apt.client.last_name ?? ""}
        </p>
      </div>

      <form
        action={rescheduleTherapyAppointment}
        className="grid max-w-md gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
      >
        <input type="hidden" name="id" value={apt.id} />
        <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
        <label className="text-sm text-slate-300">
          {ap.startCol}
          <input
            name="start_at"
            type="datetime-local"
            required
            defaultValue={dateToDatetimeLocalValue(apt.start_at)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="text-sm text-slate-300">
          {ap.endOptional}
          <input
            name="end_at"
            type="datetime-local"
            defaultValue={apt.end_at ? dateToDatetimeLocalValue(apt.end_at) : ""}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="text-sm text-slate-300">
          {ap.reasonOptional}
          <input
            name="reschedule_reason"
            defaultValue={apt.reschedule_reason ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <button
          type="submit"
          className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          {ap.save}
        </button>
      </form>
    </div>
  );
}
