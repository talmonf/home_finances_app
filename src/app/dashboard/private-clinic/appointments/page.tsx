import Link from "next/link";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatClientNameForDisplay } from "@/lib/privacy-display";
import { privateClinicAppointments, privateClinicCommon } from "@/lib/private-clinic-i18n";
import { formatHouseholdDateUtcWithTime } from "@/lib/household-date-format";
import { redirect } from "next/navigation";
import { cancelTherapyAppointment } from "../actions";
import { formatJobDisplayLabel } from "@/lib/job-label";
import {
  jobWherePrivateClinicScoped,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/appointments";

export default async function AppointmentsPage() {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const ap = privateClinicAppointments(uiLanguage);
  const now = new Date();

  const upcoming = await prisma.therapy_appointments.findMany({
    where: {
      household_id: householdId,
      job: jobScope,
      start_at: { gte: now },
      status: "scheduled",
    },
    orderBy: { start_at: "asc" },
    take: 100,
    include: { client: true, job: true },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-slate-200">{ap.upcoming}</h2>
        <Link
          href={`${LIST}/new`}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          {ap.addAppointment}
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-slate-500">{ap.noUpcoming}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-3 py-2 text-slate-300">{ap.startCol}</th>
                <th className="px-3 py-2 text-slate-300">{c.client}</th>
                <th className="px-3 py-2 text-slate-300">{c.job}</th>
                <th className="px-3 py-2 text-slate-300">{ap.visitTypeCol}</th>
                <th className="px-3 py-2 text-slate-300">{ap.actionsCol}</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((a) => (
                <tr key={a.id} className="border-b border-slate-700/80">
                  <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                    {formatHouseholdDateUtcWithTime(a.start_at, dateDisplayFormat)}
                  </td>
                  <td className="px-3 py-2 text-slate-100">
                    {formatClientNameForDisplay(obfuscate, a.client.first_name, a.client.last_name)}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{formatJobDisplayLabel(a.job)}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {therapyVisitTypeLabel(uiLanguage, a.visit_type)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`${LIST}/${a.id}/edit`}
                        className="text-xs text-sky-400 hover:text-sky-300"
                      >
                        {ap.edit}
                      </Link>
                      <Link
                        href={`${LIST}/${a.id}/reschedule`}
                        className="text-xs text-sky-400 hover:text-sky-300"
                      >
                        {ap.reschedule}
                      </Link>
                      <ConfirmDeleteForm
                        action={cancelTherapyAppointment}
                        message={ap.cancelConfirm}
                        className="inline"
                      >
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="redirect_on_success" value={`${LIST}?updated=1`} />
                        <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                          {ap.cancel}
                        </button>
                      </ConfirmDeleteForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
