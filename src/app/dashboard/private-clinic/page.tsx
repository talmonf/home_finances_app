import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { privateClinicOverviewCardLabel } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PrivateClinicOverviewPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();

  const [clients, treatments, receipts, expenses, appointments, consultations, travel] =
    await Promise.all([
      prisma.therapy_clients.count({ where: { household_id: householdId, is_active: true } }),
      prisma.therapy_treatments.count({ where: { household_id: householdId } }),
      prisma.therapy_receipts.count({ where: { household_id: householdId } }),
      prisma.therapy_job_expenses.count({ where: { household_id: householdId } }),
      prisma.therapy_appointments.count({
        where: { household_id: householdId, status: "scheduled", start_at: { gte: new Date() } },
      }),
      prisma.therapy_consultations.count({ where: { household_id: householdId } }),
      prisma.therapy_travel_entries.count({ where: { household_id: householdId } }),
    ]);

  const cards = [
    { id: "activeClients" as const, value: clients },
    { id: "treatments" as const, value: treatments },
    { id: "receipts" as const, value: receipts },
    { id: "expenses" as const, value: expenses },
    { id: "appointments" as const, value: appointments },
    { id: "consultations" as const, value: consultations },
    { id: "travel" as const, value: travel },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.id}
          className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 ring-1 ring-slate-800"
        >
          <p
            className={`text-xs tracking-wide text-slate-500 ${uiLanguage === "he" ? "normal-case" : "uppercase"}`}
          >
            {privateClinicOverviewCardLabel(c.id, uiLanguage)}
          </p>
          <p className="text-2xl font-semibold text-slate-100">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
