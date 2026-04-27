import { getAuthSession, prisma } from "@/lib/auth";
import {
  jobWherePrivateClinicScoped,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import { logGeneralAuditEvent } from "@/lib/general-audit";
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

  await logGeneralAuditEvent({
    householdId,
    actorUserId: session.user.id,
    actorIsSuperAdmin: false,
    actorEmail: session.user.email,
    actorName: session.user.name,
    feature: "private_clinic_excel",
    action: "export",
    status: "started",
    summary: "Private clinic Excel export started",
  });
  try {
    const user = await prisma.users.findFirst({
      where: { id: session.user.id, household_id: householdId, is_active: true },
      select: { family_member_id: true },
    });
    const familyMemberId = user?.family_member_id ?? null;
    const jobScope = jobWherePrivateClinicScoped(familyMemberId);

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
    privateClinicReminders,
  ] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, ...jobScope },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_service_programs.findMany({
      where: { household_id: householdId, job: jobScope },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_clients.findMany({
      where: { household_id: householdId, ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId) },
      orderBy: { created_at: "desc" },
    }),
    prisma.therapy_clients_jobs.findMany({
      where: { household_id: householdId, job: jobScope },
    }),
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId, job: jobScope },
      orderBy: { occurred_at: "desc" },
    }),
    prisma.therapy_receipts.findMany({
      where: { household_id: householdId, job: jobScope },
      orderBy: { issued_at: "desc" },
    }),
    prisma.therapy_receipt_allocations.findMany({
      where: { household_id: householdId, receipt: { job: jobScope } },
    }),
    prisma.therapy_job_expenses.findMany({
      where: { household_id: householdId, job: jobScope },
      orderBy: { expense_date: "desc" },
    }),
    prisma.therapy_expense_categories.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_settings.findUnique({ where: { household_id: householdId } }),
    prisma.therapy_appointments.findMany({
      where: { household_id: householdId, job: jobScope },
      orderBy: { start_at: "asc" },
    }),
    prisma.therapy_appointment_series.findMany({
      where: { household_id: householdId, job: jobScope },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_consultations.findMany({
      where: { household_id: householdId, job: jobScope },
      orderBy: { occurred_at: "desc" },
    }),
    prisma.therapy_travel_entries.findMany({
      where: {
        household_id: householdId,
        OR: [{ job: jobScope }, { treatment: { job: jobScope } }],
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.private_clinic_reminders.findMany({
      where:
        familyMemberId != null
          ? { household_id: householdId, family_member_id: familyMemberId }
          : { household_id: householdId },
      orderBy: { reminder_date: "asc" },
    }),
  ]);

    const scopedClientIds = clients.map((c) => c.id);
    const clientRelationships =
      scopedClientIds.length === 0
        ? []
        : await prisma.therapy_client_relationships.findMany({
            where: {
              household_id: householdId,
              from_client_id: { in: scopedClientIds },
              to_client_id: { in: scopedClientIds },
            },
            orderBy: { created_at: "desc" },
          });

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
        visits_per_period_count: p.visits_per_period_count ?? "",
        visits_per_period_weeks: p.visits_per_period_weeks ?? "",
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
        end_date: c.end_date ? String(c.end_date) : "",
        notes: c.notes ?? "",
        default_job_id: c.default_job_id,
        default_program_id: c.default_program_id,
        email: c.email ?? "",
        phones: c.phones ?? "",
        address: c.address ?? "",
        visits_per_period_count: c.visits_per_period_count ?? "",
        visits_per_period_weeks: c.visits_per_period_weeks ?? "",
        disability_status: c.disability_status ?? "",
        rehab_basket_status: c.rehab_basket_status ?? "",
        family_id: c.family_id ?? "",
        billing_basis: c.billing_basis ?? "",
        billing_timing: c.billing_timing ?? "",
        default_visit_type: c.default_visit_type ?? "",
        kupat_holim: c.kupat_holim ?? "",
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
      "ClientRelationships",
      clientRelationships.map((r) => ({
        id: r.id,
        household_id: r.household_id,
        from_client_id: r.from_client_id,
        to_client_id: r.to_client_id,
        relationship: r.relationship,
      })),
    ),
    sheet(
      "Treatments",
      treatments.map((t) => ({
        id: t.id,
        client_id: t.client_id,
        job_id: t.job_id,
        program_id: t.program_id,
        family_id: t.family_id ?? "",
        occurred_at: t.occurred_at.toISOString(),
        amount: t.amount.toString(),
        currency: t.currency,
        visit_type: t.visit_type,
        note_1: t.note_1 ?? "",
        note_2: t.note_2 ?? "",
        note_3: t.note_3 ?? "",
        linked_transaction_id: t.linked_transaction_id ?? "",
        payment_date: t.payment_date ? String(t.payment_date).slice(0, 10) : "",
        payment_method: t.payment_method ?? "",
        payment_bank_account_id: t.payment_bank_account_id ?? "",
        payment_digital_payment_method_id: t.payment_digital_payment_method_id ?? "",
        reported_to_external_system: t.reported_to_external_system,
        import_key: t.import_key ?? "",
      })),
    ),
    sheet(
      "Receipts",
      receipts.map((r) => ({
        id: r.id,
        job_id: r.job_id,
        client_id: r.client_id ?? "",
        family_id: r.family_id ?? "",
        program_id: r.program_id ?? "",
        receipt_number: r.receipt_number,
        issued_at: String(r.issued_at),
        total_amount: r.total_amount.toString(),
        currency: r.currency,
        recipient_type: r.recipient_type,
        payment_method: r.payment_method,
        covered_period_start: r.covered_period_start ? String(r.covered_period_start).slice(0, 10) : "",
        covered_period_end: r.covered_period_end ? String(r.covered_period_end).slice(0, 10) : "",
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
        name_he: c.name_he ?? "",
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
        image_file_name: e.image_file_name ?? "",
        image_mime_type: e.image_mime_type ?? "",
        image_storage_bucket: e.image_storage_bucket ?? "",
        image_storage_key: e.image_storage_key ?? "",
        image_storage_url: e.image_storage_url ?? "",
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
        family_id: a.family_id ?? "",
        job_id: a.job_id,
        program_id: a.program_id ?? "",
        series_id: a.series_id ?? "",
        visit_type: a.visit_type,
        start_at: a.start_at.toISOString(),
        end_at: a.end_at?.toISOString() ?? "",
        status: a.status,
        treatment_id: a.treatment_id ?? "",
        reschedule_reason: a.reschedule_reason ?? "",
        cancellation_reason: a.cancellation_reason ?? "",
      })),
    ),
    sheet(
      "ConsultationTypes",
      consultationTypes.map((c) => ({
        id: c.id,
        name: c.name,
        name_he: c.name_he ?? "",
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
      "PrivateClinicReminders",
      privateClinicReminders.map((r) => ({
        id: r.id,
        family_member_id: r.family_member_id ?? "",
        reminder_date: String(r.reminder_date),
        category: r.category,
        description: r.description ?? "",
        created_at: r.created_at.toISOString(),
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
              family_therapy_enabled: settings.family_therapy_enabled,
              nav_tabs_json: settings.nav_tabs_json ? JSON.stringify(settings.nav_tabs_json) : "",
              hebrew_transcription_provider: settings.hebrew_transcription_provider,
              usual_treatment_cost_for_import: settings.usual_treatment_cost_for_import?.toString() ?? "",
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
    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: false,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_excel",
      action: "export",
      status: "success",
      summary: "Private clinic Excel export completed",
      metadata: { sheetCount: sheets.length, filename },
    });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: false,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_excel",
      action: "export",
      status: "failed",
      summary: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
