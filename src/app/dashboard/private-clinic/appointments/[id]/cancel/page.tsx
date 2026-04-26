import { notFound, redirect } from "next/navigation";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { privateClinicAppointments } from "@/lib/private-clinic-i18n";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import { cancelTherapyAppointment } from "../../../actions";
import { DashboardModal } from "@/components/dashboard-modal";
import { AppointmentChangeReasonFields } from "../../appointment-change-reason-fields";

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/appointments";

type PageProps = { params: Promise<{ id: string }> };

export default async function CancelAppointmentPage({ params }: PageProps) {
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
    include: { client: true },
  });

  if (!apt) notFound();

  return (
    <DashboardModal title={ap.cancelTitle} closeHref={LIST} closeLabel={ap.backToAppointments} maxWidthClassName="max-w-xl">
      <p className="mb-4 text-sm text-slate-400">
        {apt.client.first_name} {apt.client.last_name ?? ""}
      </p>
      <form action={cancelTherapyAppointment} className="grid gap-3">
        <input type="hidden" name="id" value={apt.id} />
        <input type="hidden" name="redirect_on_success" value={`${LIST}?updated=1`} />
        <AppointmentChangeReasonFields
          reasonFieldName="cancellation_reason"
          notesFieldName="cancellation_notes"
          reasonLabel={ap.reason}
          notesLabel={ap.notes}
          otherValue="other"
          notesRequiredMessage={ap.notesRequiredForOther}
          options={[
            { value: "Therapist cancelled", label: ap.therapistCancelled },
            { value: "Patient cancelled", label: ap.patientCancelled },
            { value: "other", label: ap.other },
          ]}
        />
        <button
          type="submit"
          className="w-fit rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-rose-400"
        >
          {ap.cancel}
        </button>
      </form>
    </DashboardModal>
  );
}
