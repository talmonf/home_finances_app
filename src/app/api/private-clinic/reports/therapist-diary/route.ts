import { getAuthSession, getCurrentUiLanguage, prisma } from "@/lib/auth";
import { privateClinicReports } from "@/lib/private-clinic-i18n";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Snapshot = {
  job_id?: string;
  client_name?: string;
  start_at?: string;
  end_at?: string | null;
  cancellation_reason?: string | null;
  reschedule_reason?: string | null;
};

function toMetaRecord(meta: unknown): Record<string, unknown> | null {
  if (meta == null || typeof meta !== "object") return null;
  return meta as Record<string, unknown>;
}

function snapshotFromMetadata(meta: unknown): Snapshot | null {
  const m = toMetaRecord(meta);
  if (!m) return null;
  const snap = m.snapshot;
  if (snap && typeof snap === "object") return snap as Snapshot;
  const after = m.after;
  if (after && typeof after === "object") return after as Snapshot;
  const before = m.before;
  if (before && typeof before === "object") return before as Snapshot;
  return null;
}

function textFromMetadata(meta: unknown, key: "reason" | "notes"): string {
  const m = toMetaRecord(meta);
  const value = m?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function detailTextFromAuditMetadata(meta: unknown): string {
  const reasonFromMeta = textFromMetadata(meta, "reason");
  const notesFromMeta = textFromMetadata(meta, "notes");
  if (reasonFromMeta && notesFromMeta) {
    return reasonFromMeta.includes(notesFromMeta)
      ? reasonFromMeta
      : `${reasonFromMeta}: ${notesFromMeta}`;
  }
  if (reasonFromMeta) return reasonFromMeta;
  if (notesFromMeta) return notesFromMeta;

  const snap = snapshotFromMetadata(meta);
  return snap?.reschedule_reason || snap?.cancellation_reason || "—";
}

function formatIsoDateTime(value?: string | null): string {
  if (!value) return "";
  return value.replace("T", " ").slice(0, 19);
}

function compactText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 1))}…`;
}

export async function GET() {
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (!session?.user || !householdId || session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);
  const uiLanguage = await getCurrentUiLanguage();
  const reportStrings = privateClinicReports(uiLanguage);
  const pdfStrings =
    uiLanguage === "he"
      ? {
          title: reportStrings.therapistDiaryTitle,
          generated: "נוצר בתאריך",
          when: reportStrings.tableWhen,
          user: reportStrings.tableUser,
          action: reportStrings.tableAction,
          appointment: reportStrings.tableAppointment,
          client: reportStrings.tableClient,
          details: reportStrings.tableDetails,
          empty: reportStrings.empty,
        }
      : {
          title: reportStrings.therapistDiaryTitle,
          generated: "Generated",
          when: reportStrings.tableWhen,
          user: reportStrings.tableUser,
          action: reportStrings.tableAction,
          appointment: reportStrings.tableAppointment,
          client: reportStrings.tableClient,
          details: reportStrings.tableDetails,
          empty: reportStrings.empty,
        };

  const allowedJobs = await prisma.jobs.findMany({
    where: { household_id: householdId, ...jobScope },
    select: { id: true },
  });
  const allowedJobIds = new Set(allowedJobs.map((j) => j.id));

  const rows = await prisma.therapy_appointment_audits.findMany({
    where: { household_id: householdId },
    include: {
      user: { select: { full_name: true } },
      appointment: { select: { job_id: true } },
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  const filtered = rows.filter((r) => {
    if (r.appointment) return allowedJobIds.has(r.appointment.job_id);
    const snap = snapshotFromMetadata(r.metadata);
    const jid = snap?.job_id;
    if (jid && allowedJobIds.has(jid)) return true;
    return false;
  });

  const exportRows = filtered.map((r) => {
    const snap = snapshotFromMetadata(r.metadata);
    const appointment = snap?.end_at
      ? `${formatIsoDateTime(snap.start_at)} -> ${formatIsoDateTime(snap.end_at)}`
      : formatIsoDateTime(snap?.start_at) || "—";
    const details = detailTextFromAuditMetadata(r.metadata);

    return {
      when: formatIsoDateTime(r.created_at.toISOString()),
      user: r.user.full_name,
      action: r.action,
      appointment,
      client: snap?.client_name ?? "—",
      details,
    };
  });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const width = 842;
  const height = 595;
  const margin = 24;
  const rowHeight = 16;
  const columns = [
    { key: "when", label: pdfStrings.when, width: 130, maxLen: 19 },
    { key: "user", label: pdfStrings.user, width: 120, maxLen: 20 },
    { key: "action", label: pdfStrings.action, width: 90, maxLen: 14 },
    { key: "appointment", label: pdfStrings.appointment, width: 220, maxLen: 35 },
    { key: "client", label: pdfStrings.client, width: 120, maxLen: 20 },
    { key: "details", label: pdfStrings.details, width: 130, maxLen: 26 },
  ] as const;

  let page = pdf.addPage([width, height]);
  let y = height - margin;

  const drawHeader = () => {
    page.drawText(pdfStrings.title, { x: margin, y, size: 14, font: fontBold });
    y -= 18;
    page.drawText(`${pdfStrings.generated}: ${formatIsoDateTime(new Date().toISOString())}`, {
      x: margin,
      y,
      size: 9,
      font,
    });
    y -= 18;

    let x = margin;
    columns.forEach((col) => {
      page.drawText(col.label, { x, y, size: 9, font: fontBold });
      x += col.width;
    });
    y -= 12;
  };

  drawHeader();

  for (const row of exportRows) {
    if (y <= margin + rowHeight) {
      page = pdf.addPage([width, height]);
      y = height - margin;
      drawHeader();
    }

    let x = margin;
    columns.forEach((col) => {
      const value = String(row[col.key] ?? "");
      page.drawText(compactText(value, col.maxLen), { x, y, size: 8, font });
      x += col.width;
    });
    y -= rowHeight;
  }

  if (exportRows.length === 0) {
    page.drawText(pdfStrings.empty, { x: margin, y, size: 10, font });
  }

  const buf = Buffer.from(await pdf.save());

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="therapist-diary.pdf"`,
    },
  });
}
