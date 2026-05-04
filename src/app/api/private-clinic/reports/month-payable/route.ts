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

function formatPersonName(c: { first_name: string; last_name: string | null }): string {
  return `${c.first_name} ${c.last_name ?? ""}`.trim();
}

type UnifiedRow = {
  line_type: string;
  occurred_at: string;
  occurred_at_sort: string;
  job: string;
  program: string;
  consultation_type: string;
  client: string;
  visit_type: string;
  amount_payable: number;
  currency: string;
  allocated_sum: number;
  notes: string;
  id: string;
  reported_to_external: string;
};

function appendMonthPayableSheet(
  wb: XLSX.WorkBook,
  name: string,
  exportRows: Record<string, unknown>[],
  autofilterDataRowCount: number,
) {
  const safeName = name.slice(0, 31);
  const ws = XLSX.utils.json_to_sheet(exportRows.length ? exportRows : [{ _empty: "" }]);
  if (autofilterDataRowCount > 0 && exportRows.length > 0) {
    const colCount = Object.keys(exportRows[0]).length;
    if (colCount > 0) {
      ws["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: autofilterDataRowCount, c: colCount - 1 },
        }),
      };
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, safeName);
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
    const baseTreatmentWhere = {
      household_id: householdId,
      job_id: jobId,
      occurred_at: { gte: monthStart, lt: monthEndExclusive },
    };

    const baseConsultationWhere = {
      household_id: householdId,
      job_id: jobId,
      occurred_at: { gte: monthStart, lt: monthEndExclusive },
    };

    const baseTravelWhere = {
      household_id: householdId,
      occurred_at: { gte: monthStart, lt: monthEndExclusive },
      AND: [
        { OR: [{ job: jobScope }, { treatment: { job: jobScope } }] },
        { OR: [{ job_id: jobId }, { treatment: { job_id: jobId } }] },
      ],
    };

    const [treatments, consultations, travelRows] = await Promise.all([
      prisma.therapy_treatments.findMany({
        where: baseTreatmentWhere,
        orderBy: { occurred_at: "asc" },
        select: {
          id: true,
          occurred_at: true,
          amount: true,
          currency: true,
          visit_type: true,
          reported_to_external_system: true,
          program: { select: { name: true } },
          client: { select: { first_name: true, last_name: true } },
          participants: {
            select: { client: { select: { first_name: true, last_name: true } } },
          },
          receipt_allocations: { select: { amount: true } },
        },
      }),
      prisma.therapy_consultations.findMany({
        where: baseConsultationWhere,
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
          participants: {
            select: { client: { select: { first_name: true, last_name: true } } },
          },
          receipt_allocations: { select: { amount: true } },
        },
      }),
      prisma.therapy_travel_entries.findMany({
        where: baseTravelWhere,
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
              program: { select: { name: true } },
              client: { select: { first_name: true, last_name: true } },
              participants: {
                select: { client: { select: { first_name: true, last_name: true } } },
              },
            },
          },
          receipt_allocations: { select: { amount: true } },
        },
      }),
    ]);

    const unified: UnifiedRow[] = [];

    for (const t of treatments) {
      const allocSum = t.receipt_allocations.reduce((s, a) => s + num(a.amount), 0);
      const nameSet = new Set<string>();
      nameSet.add(formatPersonName(t.client));
      for (const p of t.participants) {
        nameSet.add(formatPersonName(p.client));
      }
      const clientStr = [...nameSet].filter(Boolean).join("; ");
      const iso = t.occurred_at.toISOString();
      unified.push({
        line_type: "treatment",
        occurred_at: iso.slice(0, 10),
        occurred_at_sort: iso,
        job: jobLabel,
        program: t.program?.name ?? "",
        consultation_type: "",
        client: clientStr,
        visit_type: String(t.visit_type),
        amount_payable: num(t.amount),
        currency: t.currency,
        allocated_sum: allocSum,
        notes: "",
        id: t.id,
        reported_to_external: String(t.reported_to_external_system),
      });
    }

    for (const c of consultations) {
      const line = consultationLineAmount(c);
      const allocSum = c.receipt_allocations.reduce((s, a) => s + num(a.amount), 0);
      const nameSet = new Set<string>();
      for (const p of c.participants) {
        nameSet.add(formatPersonName(p.client));
      }
      const clientStr = [...nameSet].filter(Boolean).join("; ");
      const iso = c.occurred_at.toISOString();
      unified.push({
        line_type: "consultation",
        occurred_at: iso.slice(0, 10),
        occurred_at_sort: iso,
        job: jobLabel,
        program: "",
        consultation_type: c.consultation_type.name,
        client: clientStr,
        visit_type: "",
        amount_payable: line,
        currency: c.currency,
        allocated_sum: allocSum,
        notes: c.notes ?? "",
        id: c.id,
        reported_to_external: "",
      });
    }

    for (const tr of travelRows) {
      const allocSum = tr.receipt_allocations.reduce((s, a) => s + num(a.amount), 0);
      let clientStr = "";
      let programStr = "";
      if (tr.treatment) {
        const nameSet = new Set<string>();
        nameSet.add(formatPersonName(tr.treatment.client));
        for (const p of tr.treatment.participants) {
          nameSet.add(formatPersonName(p.client));
        }
        clientStr = [...nameSet].filter(Boolean).join("; ");
        programStr = tr.treatment.program?.name ?? "";
      }
      const at = tr.occurred_at!;
      const iso = at.toISOString();
      unified.push({
        line_type: "travel",
        occurred_at: iso.slice(0, 10),
        occurred_at_sort: iso,
        job: jobLabel,
        program: programStr,
        consultation_type: "",
        client: clientStr,
        visit_type: "",
        amount_payable: num(tr.amount),
        currency: tr.currency,
        allocated_sum: allocSum,
        notes: tr.notes ?? "",
        id: tr.id,
        reported_to_external: "",
      });
    }

    unified.sort((a, b) => {
      const c = a.occurred_at_sort.localeCompare(b.occurred_at_sort);
      if (c !== 0) return c;
      const t = a.line_type.localeCompare(b.line_type);
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    });

    const totalsByCurrency = new Map<string, number>();
    for (const r of unified) {
      const cur = r.currency || "ILS";
      totalsByCurrency.set(cur, (totalsByCurrency.get(cur) ?? 0) + r.amount_payable);
    }

    const exportRows: Record<string, unknown>[] = unified.map((r) => ({
      line_type: r.line_type,
      occurred_at: r.occurred_at,
      job: r.job,
      program: r.program,
      consultation_type: r.consultation_type,
      client: r.client,
      visit_type: r.visit_type,
      amount_payable: r.amount_payable,
      currency: r.currency,
      allocated_sum: r.allocated_sum,
      notes: r.notes,
      id: r.id,
      reported_to_external: r.reported_to_external,
    }));

    const currencies = [...totalsByCurrency.keys()].sort();
    if (unified.length > 0 && currencies.length > 0) {
      exportRows.push({});
      for (const cur of currencies) {
        exportRows.push({
          line_type: "TOTAL",
          occurred_at: "",
          job: "",
          program: "",
          consultation_type: "",
          client: "",
          visit_type: "",
          amount_payable: totalsByCurrency.get(cur) ?? 0,
          currency: cur,
          allocated_sum: "",
          notes: "",
          id: "",
          reported_to_external: "",
        });
      }
    }

    const wb = XLSX.utils.book_new();
    const sheetRows =
      exportRows.length > 0
        ? exportRows
        : [{ line_type: "(no rows)", occurred_at: "", job: jobLabel }];
    appendMonthPayableSheet(wb, "Month_payable", sheetRows, unified.length);

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
        rowCount: unified.length,
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
