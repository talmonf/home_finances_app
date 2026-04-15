import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { OBFUSCATED } from "@/lib/privacy-display";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { CLINIC_INSURANCE_POLICY_TYPES } from "@/lib/private-clinic/constants";
import {
  buildUnifiedReminderRows,
  startOfTodayLocal,
} from "@/lib/private-clinic/reminders-logic";
import { jobWhereInPrivateClinicModule } from "@/lib/private-clinic/jobs-scope";
import { privateClinicReminders } from "@/lib/private-clinic-i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createPrivateClinicReminder,
  updatePrivateClinicReminder,
  deletePrivateClinicReminder,
} from "./actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";

export const dynamic = "force-dynamic";

function toDateInputValue(d: Date) {
  const z = new Date(d);
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, "0");
  const day = String(z.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    error?: string;
    edit?: string;
  }>;
};

export default async function PrivateClinicRemindersPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const t = privateClinicReminders(uiLanguage);
  const resolved = searchParams ? await searchParams : undefined;
  const editId = resolved?.edit?.trim() || null;

  const today = startOfTodayLocal();

  const [manualRows, subscriptions, clients, clinicInsurance, clinicRentals, editingRow] =
    await Promise.all([
      prisma.private_clinic_reminders.findMany({
        where: { household_id: householdId },
        orderBy: { reminder_date: "asc" },
      }),
      prisma.subscriptions.findMany({
        where: {
          household_id: householdId,
          job_id: { not: null },
          job: jobWhereInPrivateClinicModule,
        },
      }),
      prisma.therapy_clients.findMany({
        where: { household_id: householdId },
        select: {
          id: true,
          is_active: true,
          end_date: true,
          first_name: true,
          last_name: true,
        },
      }),
      prisma.insurance_policies.findMany({
        where: { household_id: householdId, policy_type: { in: [...CLINIC_INSURANCE_POLICY_TYPES] } },
        select: {
          id: true,
          policy_type: true,
          is_active: true,
          expiration_date: true,
          provider_name: true,
          policy_name: true,
        },
      }),
      prisma.rentals.findMany({
        where: { household_id: householdId, is_clinic_lease: true },
        include: { property: true },
      }),
      editId
        ? prisma.private_clinic_reminders.findFirst({
            where: { id: editId, household_id: householdId },
          })
        : Promise.resolve(null),
    ]);

  const rows = buildUnifiedReminderRows({
    today,
    manual: manualRows,
    subscriptions,
    clients,
    clinicInsurance,
    clinicRentals: clinicRentals.map((r) => ({
      id: r.id,
      is_clinic_lease: r.is_clinic_lease,
      end_date: r.end_date,
      property_id: r.property_id,
      property: r.property ? { name: r.property.name } : undefined,
    })),
  });

  function sourceLabel(kind: (typeof rows)[number]["kind"]) {
    switch (kind) {
      case "manual":
        return t.sourceManual;
      case "subscription":
        return t.sourceSubscription;
      case "client":
        return t.sourceClient;
      case "insurance":
        return t.sourceInsurance;
      case "rental":
        return t.sourceRental;
      default:
        return kind;
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-lg font-medium text-slate-200">{t.title}</h2>
        <p className="text-sm text-slate-400">{t.blurb}</p>
      </header>

      {(resolved?.created ||
        resolved?.updated ||
        resolved?.deleted ||
        resolved?.error) && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            resolved.error
              ? "border-rose-600 bg-rose-950/60 text-rose-100"
              : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
          }`}
        >
          {resolved.error
            ? decodeURIComponent(resolved.error.replace(/\+/g, " "))
            : resolved.deleted
              ? t.deletedMsg
              : resolved.created
                ? "Reminder added."
                : "Updated."}
        </div>
      )}

      {editingRow ? (
        <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h3 className="text-md font-medium text-slate-200">{t.editManual}</h3>
          <form action={updatePrivateClinicReminder} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={editingRow.id} />
            <div>
              <label className="mb-1 block text-xs text-slate-400">{t.reminderDate}</label>
              <input
                name="reminder_date"
                type="date"
                required
                defaultValue={toDateInputValue(editingRow.reminder_date)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">{t.category}</label>
              <input
                name="category"
                defaultValue={editingRow.category}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">{t.description}</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={editingRow.description ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                {t.save}
              </button>
              <Link
                href="/dashboard/private-clinic/reminders"
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                {t.cancelEdit}
              </Link>
            </div>
          </form>
        </section>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-md font-medium text-slate-200">{t.addManual}</h3>
        <form
          action={createPrivateClinicReminder}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t.reminderDate}</label>
            <input
              name="reminder_date"
              type="date"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t.category}</label>
            <input name="category" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-400">{t.description}</label>
            <textarea
              name="description"
              rows={2}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {t.addManual}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h3 className="text-md font-medium text-slate-200">{t.upcomingTitle}</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-4 py-3 font-medium text-slate-300">{t.tableSource}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.tableDate}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.tableSummary}</th>
                  <th className="px-4 py-3 font-medium text-slate-300">{t.tableActions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-300">{sourceLabel(r.kind)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatHouseholdDate(r.reminderDate, dateDisplayFormat)}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {r.kind === "client" && obfuscate ? OBFUSCATED : r.summary}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={r.href} className="text-sky-400 hover:text-sky-300">
                          {t.openRelated}
                        </Link>
                        {r.editHref ? (
                          <Link href={r.editHref} className="text-sky-400 hover:text-sky-300">
                            {r.kind === "manual" ? t.editManual : t.editRelated}
                          </Link>
                        ) : null}
                        {r.kind === "manual" ? (
                          <ConfirmDeleteForm
                            action={deletePrivateClinicReminder.bind(null, r.sourceId)}
                            className="inline"
                          >
                            <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                              {t.deleteBtn}
                            </button>
                          </ConfirmDeleteForm>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
