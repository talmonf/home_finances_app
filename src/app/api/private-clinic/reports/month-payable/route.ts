import { getAuthSession, prisma } from "@/lib/auth";
import { logGeneralAuditEvent } from "@/lib/general-audit";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function num(d: unknown): number {
  if (d == null) return 0;
  const n = Number(d);
  return Number.isFinite(n) ? n : 0;
}

function consultationLineAmount(row: { amount: unknown; income_amount: unknown }): number {
  const a = num(row.amount);
  if (a !== 0) return a;
  return num(row.income_amount);
}

function monthBoundsUtc(year: number, month1to12: number): { monthStart: Date; monthEndExclusive: Date } {
  const monthStart = new Date(Date.UTC(year, month1to12 - 1, 1));
  const monthEndExclusive = new Date(Date.UTC(year, month1to12, 1));
  return { monthStart, monthEndExclusive };
}

function receiptOverlapsMonth(
  issuedAt: Date,
  coveredStart: Date | null,
  coveredEnd: Date | null,
  monthStart: Date,
  monthEndExclusive: Date,
): boolean {
  if (coveredStart && coveredEnd) {
    return coveredStart < monthEndExclusive && coveredEnd >= monthStart;
  }
  return issuedAt >= monthStart && issuedAt < monthEndExclusive;
}

function sheet(name: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ _empty: "" }]);
  return { name: name.slice(0, 31), ws };
}

export async function GET(req: Request) {
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (!session?.user || !householdId || session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId")?.trim() ?? "";
  const yearRaw = url.searchParams.get("year");
  const monthRaw = url.searchParams.get("month");
  const year = yearRaw != null ? Number(yearRaw) : NaN;
  const month = monthRaw != null ? Number(monthRaw) : NaN;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "year must be an integer 2000–2100" }, { status: 400 });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "month must be 1–12" }, { status: 400 });
  }

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const job = await prisma.jobs.findFirst({
    where: { id: jobId, household_id: householdId, ...jobScope },
    select: {
      id: true,
      job_title: true,
      employer_name: true,
      external_reporting_system: true,
    },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found or not accessible" }, { status: 404 });
  }

  const { monthStart, monthEndExclusive } = monthBoundsUtc(year, month);
  const jobLabel = formatJobDisplayLabel(job);

  await logGeneralAuditEvent({
    householdId,
    actorUserId: session.user.id,
    actorIsSuperAdmin: false,
    actorEmail: session.user.email,
    actorName: session.user.name,
    feature: "private_clinic_month_payable",
    action: "export",
    status: "started",
    summary: "Month payable report started",
    metadata: { jobId, year, month },
  });

  try {
    const [treatments, consultations, travelRows, receipts] = await Promise.all([
      prisma.therapy_treatments.findMany({
        where: {
          household_id: householdId,
          job_id: jobId,
          occurred_at: { gte: monthStart, lt: monthEndExclusive },
        },
        orderBy: { occurred_at: "asc" },
        select: {
          id: true,
          occurred_at: true,
          amount: true,
          currency: true,
          visit_type: true,
          reported_to_external_system: true,
          client: { select: { first_name: true, last_name: true } },
          receipt_allocations: { select: { amount: true } },
        },
      }),
      prisma.therapy_consultations.findMany({
        where: {
          household_id: householdId,
          job_id: jobId,
          occurred_at: { gte: monthStart, lt: monthEndExclusive },
        },
        orderBy: { occurred_at: "asc" },
        select: {
          id: true,
          occurred_at: true,
          amount: true,
          income_amount: true,
          cost_amount: true,
          currency: true,
          notes: true,
          consultation_type: { select: { name: true } },
          receipt_allocations: { select: { amount: true } },
        },
      }),
      prisma.therapy_travel_entries.findMany({
        where: {
          household_id: householdId,
          occurred_at: { gte: monthStart, lt: monthEndExclusive },
          AND: [
            { OR: [{ job: jobScope }, { treatment: { job: jobScope } }] },
            { OR: [{ job_id: jobId }, { treatment: { job_id: jobId } }] },
          ],
        },
        orderBy: { occurred_at: "asc" },
        select: {
          id: true,
          occurred_at: true,
          amount: true,
          currency: true,
          notes: true,
          job_id: true,
          treatment_id: true,
          treatment: {
            select: {
              job_id: true,
              client: { select: { first_name: true, last_name: true } },
            },
          },
          receipt_allocations: { select: { amount: true } },
        },
      }),
      prisma.therapy_receipts.findMany({
        where: { household_id: householdId, job_id: jobId },
        select: {
          id: true,
          receipt_number: true,
          issued_at: true,
          total_amount: true,
          net_amount: true,
          currency: true,
          recipient_type: true,
          receipt_kind: true,
          covered_period_start: true,
          covered_period_end: true,
        },
      }),
    ]);

    const overlappingReceipts = receipts.filter((r) =>
      receiptOverlapsMonth(
        r.issued_at,
        r.covered_period_start,
        r.covered_period_end,
        monthStart,
        monthEndExclusive,
      ),
    );
    const overlapIds = overlappingReceipts.map((r) => r.id);

    const [allocTreat, allocConsult, allocTravel] =
      overlapIds.length === 0
        ? [[], [], []] as const
        : await Promise.all([
            prisma.therapy_receipt_allocations.findMany({
              where: { household_id: householdId, receipt_id: { in: overlapIds } },
              select: { amount: true },
            }),
            prisma.therapy_receipt_consultation_allocations.findMany({
              where: { household_id: householdId, receipt_id: { in: overlapIds } },
              select: { amount: true },
            }),
            prisma.therapy_receipt_travel_allocations.findMany({
              where: { household_id: householdId, receipt_id: { in: overlapIds } },
              select: { amount: true },
            }),
          ]);

    const sumTreatmentActivity = treatments.reduce((s, t) => s + num(t.amount), 0);
    const sumConsultActivity = consultations.reduce((s, c) => s + consultationLineAmount(c), 0);
    const sumTravelActivity = travelRows.reduce((s, t) => s + num(t.amount), 0);

    const sumAllocOnOverlapReceipts =
      allocTreat.reduce((s, a) => s + num(a.amount), 0) +
      allocConsult.reduce((s, a) => s + num(a.amount), 0) +
      allocTravel.reduce((s, a) => s + num(a.amount), 0);

    const sumNetReceiptsOverlap = overlappingReceipts.reduce((s, r) => s + num(r.net_amount), 0);
    const sumTotalReceiptsOverlap = overlappingReceipts.reduce((s, r) => s + num(r.total_amount), 0);

    let treatmentsNoAllocation = 0;
    let treatmentsUnderAllocated = 0;
    for (const t of treatments) {
      const allocSum = t.receipt_allocations.reduce((s, a) => s + num(a.amount), 0);
      if (allocSum === 0) treatmentsNoAllocation += 1;
      if (t.amount != null && allocSum < num(t.amount) - 0.005) treatmentsUnderAllocated += 1;
    }

    let consultationsNoAllocation = 0;
    for (const c of consultations) {
      const line = consultationLineAmount(c);
      const allocSum = c.receipt_allocations.reduce((s, a) => s + num(a.amount), 0);
      if (line > 0 && allocSum === 0) consultationsNoAllocation += 1;
    }

    let travelNoAllocation = 0;
    for (const tr of travelRows) {
      const amt = num(tr.amount);
      const allocSum = tr.receipt_allocations.reduce((s, a) => s + num(a.amount), 0);
      if (amt > 0 && allocSum === 0) travelNoAllocation += 1;
    }

    const summaryRows: Record<string, unknown>[] = [
      { key: "job", value: jobLabel },
      { key: "job_id", value: job.id },
      { key: "external_reporting_system", value: job.external_reporting_system ?? "" },
      { key: "calendar_month_utc", value: `${year}-${String(month).padStart(2, "0")}` },
      { key: "month_range_start_utc", value: monthStart.toISOString().slice(0, 10) },
      { key: "month_range_end_exclusive_utc", value: monthEndExclusive.toISOString().slice(0, 10) },
      { key: "", value: "" },
      {
        key: "activity_treatments_count",
        value: treatments.length,
      },
      { key: "activity_treatments_sum_amount", value: sumTreatmentActivity },
      {
        key: "activity_consultations_count",
        value: consultations.length,
      },
      { key: "activity_consultations_sum_line_amount", value: sumConsultActivity },
      {
        key: "activity_travel_rows_count",
        value: travelRows.length,
      },
      { key: "activity_travel_sum_amount", value: sumTravelActivity },
      {
        key: "activity_sum_treatments_plus_consultations_plus_travel",
        value: sumTreatmentActivity + sumConsultActivity + sumTravelActivity,
      },
      { key: "", value: "" },
      {
        key: "receipts_overlapping_month_count",
        value: overlappingReceipts.length,
      },
      { key: "receipts_overlapping_month_sum_net", value: sumNetReceiptsOverlap },
      { key: "receipts_overlapping_month_sum_total", value: sumTotalReceiptsOverlap },
      { key: "", value: "" },
      {
        key: "allocations_on_overlapping_receipts_sum_all_lines",
        value: sumAllocOnOverlapReceipts,
      },
      {
        key: "allocations_on_overlapping_receipts_minus_net_receipts",
        value: sumAllocOnOverlapReceipts - sumNetReceiptsOverlap,
      },
      { key: "", value: "" },
      {
        key: "qc_treatments_in_month_with_zero_allocation",
        value: treatmentsNoAllocation,
      },
      {
        key: "qc_treatments_in_month_allocated_less_than_amount",
        value: treatmentsUnderAllocated,
      },
      {
        key: "qc_consultations_in_month_with_line_amount_but_zero_allocation",
        value: consultationsNoAllocation,
      },
      {
        key: "qc_travel_in_month_with_amount_but_zero_allocation",
        value: travelNoAllocation,
      },
    ];

    const treatmentSheet = treatments.map((t) => {
      const allocSum = t.receipt_allocations.reduce((s, a) => s + num(a.amount), 0);
      const client = `${t.client.first_name} ${t.client.last_name ?? ""}`.trim();
      return {
        id: t.id,
        occurred_at: t.occurred_at.toISOString().slice(0, 10),
        visit_type: String(t.visit_type),
        amount: num(t.amount),
        currency: t.currency,
        allocated_sum: allocSum,
        reported_to_external_system: t.reported_to_external_system,
        client: client,
      };
    });

    const consultationSheet = consultations.map((c) => {
      const line = consultationLineAmount(c);
      const allocSum = c.receipt_allocations.reduce((s, a) => s + num(a.amount), 0);
      return {
        id: c.id,
        occurred_at: c.occurred_at.toISOString().slice(0, 10),
        type: c.consultation_type.name,
        line_amount: line,
        amount_raw: num(c.amount),
        income_amount_raw: num(c.income_amount),
        cost_amount_raw: num(c.cost_amount),
        currency: c.currency,
        allocated_sum: allocSum,
        notes: c.notes ?? "",
      };
    });

    const travelSheet = travelRows.map((tr) => {
      const allocSum = tr.receipt_allocations.reduce((s, a) => s + num(a.amount), 0);
      const client = tr.treatment
        ? `${tr.treatment.client.first_name} ${tr.treatment.client.last_name ?? ""}`.trim()
        : "";
      return {
        id: tr.id,
        occurred_at: tr.occurred_at ? tr.occurred_at.toISOString().slice(0, 10) : "",
        amount: num(tr.amount),
        currency: tr.currency,
        allocated_sum: allocSum,
        scope_job_id: tr.job_id ?? "",
        linked_treatment_id: tr.treatment_id ?? "",
        client: client,
        notes: tr.notes ?? "",
      };
    });

    const receiptSheet = overlappingReceipts.map((r) => ({
      receipt_number: r.receipt_number,
      issued_at: r.issued_at.toISOString().slice(0, 10),
      covered_period_start: r.covered_period_start ? r.covered_period_start.toISOString().slice(0, 10) : "",
      covered_period_end: r.covered_period_end ? r.covered_period_end.toISOString().slice(0, 10) : "",
      total_amount: num(r.total_amount),
      net_amount: num(r.net_amount),
      currency: r.currency,
      recipient_type: String(r.recipient_type),
      receipt_kind: String(r.receipt_kind),
    }));

    const wb = XLSX.utils.book_new();
    const sheets = [
      sheet("Summary", summaryRows.map((row) => ({ metric: row.key, value: row.value }))),
      sheet("Treatments", treatmentSheet),
      sheet("Consultations", consultationSheet),
      sheet("Travel", travelSheet),
      sheet("Receipts_overlap", receiptSheet),
    ];
    for (const { name, ws } of sheets) {
      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
    const filename = `private-clinic-month-payable-${year}-${String(month).padStart(2, "0")}-${job.id.slice(0, 8)}.xlsx`;

    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: false,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_month_payable",
      action: "export",
      status: "success",
      summary: "Month payable report completed",
      metadata: {
        jobId,
        year,
        month,
        treatmentCount: treatments.length,
        receiptOverlapCount: overlappingReceipts.length,
      },
    });

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: false,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_month_payable",
      action: "export",
      status: "failed",
      summary: e instanceof Error ? e.message : "Month payable export failed",
      metadata: { jobId, year, month },
    });
    throw e;
  }
}
