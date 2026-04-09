import { getAuthSession, prisma } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function sheet(name: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ _empty: "" }]);
  return { name: name.slice(0, 31), ws };
}

export async function GET() {
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (!session?.user || !householdId || session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    jobs,
    programs,
    clients,
    clientJobs,
    treatments,
    receipts,
    allocations,
    expenses,
    categories,
    settings,
    appointments,
    series,
    consultationTypes,
    consultations,
    travelEntries,
  ] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_service_programs.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_clients.findMany({
      where: { household_id: householdId },
      orderBy: { created_at: "desc" },
    }),
    prisma.therapy_clients_jobs.findMany({
      where: { household_id: householdId },
    }),
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId },
      orderBy: { occurred_at: "desc" },
    }),
    prisma.therapy_receipts.findMany({
      where: { household_id: householdId },
      orderBy: { issued_at: "desc" },
    }),
    prisma.therapy_receipt_allocations.findMany({
      where: { household_id: householdId },
    }),
    prisma.therapy_job_expenses.findMany({
      where: { household_id: householdId },
      orderBy: { expense_date: "desc" },
    }),
    prisma.therapy_expense_categories.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_settings.findUnique({ where: { household_id: householdId } }),
    prisma.therapy_appointments.findMany({
      where: { household_id: householdId },
      orderBy: { start_at: "asc" },
    }),
    prisma.therapy_appointment_series.findMany({
      where: { household_id: householdId },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_consultations.findMany({
      where: { household_id: householdId },
      orderBy: { occurred_at: "desc" },
    }),
    prisma.therapy_travel_entries.findMany({
      where: { household_id: householdId },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const wb = XLSX.utils.book_new();
  const sheets = [
    sheet(
      "Jobs",
      jobs.map((j) => ({
        id: j.id,
        family_member_id: j.family_member_id,
        employment_type: j.employment_type,
        start_date: j.start_date?.toISOString?.() ?? String(j.start_date),
        end_date: j.end_date?.toISOString?.() ?? (j.end_date ? String(j.end_date) : ""),
        job_title: j.job_title,
        employer_name: j.employer_name ?? "",
        employer_tax_number: j.employer_tax_number ?? "",
        employer_address: j.employer_address ?? "",
        notes: j.notes ?? "",
        is_active: j.is_active,
      })),
    ),
    sheet(
      "Programs",
      programs.map((p) => ({
        id: p.id,
        job_id: p.job_id,
        name: p.name,
        description: p.description ?? "",
        sort_order: p.sort_order,
        is_active: p.is_active,
      })),
    ),
    sheet(
      "Clients",
      clients.map((c) => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name ?? "",
        id_number: c.id_number ?? "",
        start_date: c.start_date ? String(c.start_date) : "",
        notes: c.notes ?? "",
        default_job_id: c.default_job_id,
        default_program_id: c.default_program_id,
        email: c.email ?? "",
        phones: c.phones ?? "",
        address: c.address ?? "",
        import_key: c.import_key ?? "",
        is_active: c.is_active,
      })),
    ),
    sheet(
      "ClientJobs",
      clientJobs.map((r) => ({
        id: r.id,
        client_id: r.client_id,
        job_id: r.job_id,
        is_primary: r.is_primary,
      })),
    ),
    sheet(
      "Treatments",
      treatments.map((t) => ({
        id: t.id,
        client_id: t.client_id,
        job_id: t.job_id,
        program_id: t.program_id,
        occurred_at: t.occurred_at.toISOString(),
        amount: t.amount.toString(),
        currency: t.currency,
        visit_type: t.visit_type,
        note_1: t.note_1 ?? "",
        note_2: t.note_2 ?? "",
        note_3: t.note_3 ?? "",
        linked_transaction_id: t.linked_transaction_id ?? "",
        import_key: t.import_key ?? "",
      })),
    ),
    sheet(
      "Receipts",
      receipts.map((r) => ({
        id: r.id,
        job_id: r.job_id,
        receipt_number: r.receipt_number,
        issued_at: String(r.issued_at),
        total_amount: r.total_amount.toString(),
        currency: r.currency,
        recipient_type: r.recipient_type,
        payment_method: r.payment_method,
        notes: r.notes ?? "",
        linked_transaction_id: r.linked_transaction_id ?? "",
        import_key: r.import_key ?? "",
      })),
    ),
    sheet(
      "ReceiptAllocations",
      allocations.map((a) => ({
        id: a.id,
        receipt_id: a.receipt_id,
        treatment_id: a.treatment_id,
        amount: a.amount.toString(),
      })),
    ),
    sheet(
      "ExpenseCategories",
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        sort_order: c.sort_order,
        is_system: c.is_system,
      })),
    ),
    sheet(
      "Expenses",
      expenses.map((e) => ({
        id: e.id,
        job_id: e.job_id,
        category_id: e.category_id,
        expense_date: String(e.expense_date),
        amount: e.amount.toString(),
        currency: e.currency,
        notes: e.notes ?? "",
        image_storage_key: e.image_storage_key ?? "",
        linked_transaction_id: e.linked_transaction_id ?? "",
        import_key: e.import_key ?? "",
      })),
    ),
    sheet(
      "AppointmentSeries",
      series.map((s) => ({
        id: s.id,
        client_id: s.client_id,
        job_id: s.job_id,
        program_id: s.program_id ?? "",
        visit_type: s.visit_type,
        recurrence: s.recurrence,
        day_of_week: s.day_of_week,
        time_of_day: s.time_of_day.toISOString(),
        start_date: String(s.start_date),
        end_date: s.end_date ? String(s.end_date) : "",
        is_active: s.is_active,
      })),
    ),
    sheet(
      "Appointments",
      appointments.map((a) => ({
        id: a.id,
        client_id: a.client_id,
        job_id: a.job_id,
        program_id: a.program_id ?? "",
        series_id: a.series_id ?? "",
        visit_type: a.visit_type,
        start_at: a.start_at.toISOString(),
        end_at: a.end_at?.toISOString() ?? "",
        status: a.status,
        treatment_id: a.treatment_id ?? "",
      })),
    ),
    sheet(
      "ConsultationTypes",
      consultationTypes.map((c) => ({
        id: c.id,
        name: c.name,
        sort_order: c.sort_order,
        is_system: c.is_system,
      })),
    ),
    sheet(
      "Consultations",
      consultations.map((c) => ({
        id: c.id,
        job_id: c.job_id,
        consultation_type_id: c.consultation_type_id,
        occurred_at: c.occurred_at.toISOString(),
        income_amount: c.income_amount?.toString() ?? "",
        income_currency: c.income_currency,
        cost_amount: c.cost_amount?.toString() ?? "",
        cost_currency: c.cost_currency,
        notes: c.notes ?? "",
        linked_income_transaction_id: c.linked_income_transaction_id ?? "",
        linked_cost_transaction_id: c.linked_cost_transaction_id ?? "",
      })),
    ),
    sheet(
      "Travel",
      travelEntries.map((t) => ({
        id: t.id,
        job_id: t.job_id ?? "",
        treatment_id: t.treatment_id ?? "",
        occurred_at: t.occurred_at?.toISOString() ?? "",
        amount: t.amount?.toString() ?? "",
        currency: t.currency,
        notes: t.notes ?? "",
        linked_transaction_id: t.linked_transaction_id ?? "",
      })),
    ),
    sheet(
      "Settings",
      settings
        ? [
            {
              note_1_label: settings.note_1_label,
              note_2_label: settings.note_2_label,
              note_3_label: settings.note_3_label,
              note_1_label_he: settings.note_1_label_he ?? "",
              note_2_label_he: settings.note_2_label_he ?? "",
              note_3_label_he: settings.note_3_label_he ?? "",
            },
          ]
        : [],
    ),
  ];

  for (const { name, ws } of sheets) {
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `private-clinic-export-${householdId.slice(0, 8)}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
