import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PrivateClinicOverviewPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[
        { label: "Active clients", value: clients },
        { label: "Treatments (all time)", value: treatments },
        { label: "Receipts", value: receipts },
        { label: "Clinic expenses", value: expenses },
        { label: "Upcoming appointments", value: appointments },
        { label: "Consultations logged", value: consultations },
        { label: "Travel entries", value: travel },
      ].map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 ring-1 ring-slate-800"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">{c.label}</p>
          <p className="text-2xl font-semibold text-slate-100">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
