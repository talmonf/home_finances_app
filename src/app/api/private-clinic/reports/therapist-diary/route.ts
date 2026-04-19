import { getAuthSession, prisma } from "@/lib/auth";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

type Snapshot = {
  job_id?: string;
  client_name?: string;
  job_label?: string;
  start_at?: string;
  status?: string;
};

function snapshotFromMetadata(meta: unknown): Snapshot | null {
  if (meta == null || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const snap = m.snapshot;
  if (snap && typeof snap === "object") return snap as Snapshot;
  const after = m.after;
  if (after && typeof after === "object") return after as Snapshot;
  const before = m.before;
  if (before && typeof before === "object") return before as Snapshot;
  return null;
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
    take: 5000,
  });

  const filtered = rows.filter((r) => {
    if (r.appointment) return allowedJobIds.has(r.appointment.job_id);
    const snap = snapshotFromMetadata(r.metadata);
    const jid = snap?.job_id;
    if (jid && allowedJobIds.has(jid)) return true;
    return false;
  });

  const exportRows = filtered.map((r) => {
    const meta = r.metadata as Record<string, unknown> | null;
    const snap = snapshotFromMetadata(meta);
    return {
      created_at: r.created_at.toISOString(),
      user: r.user.full_name,
      action: r.action,
      appointment_id: r.appointment_id ?? "",
      client: snap?.client_name ?? "",
      job: snap?.job_label ?? "",
      start_at: snap?.start_at ?? "",
      status: snap?.status ?? "",
      metadata: JSON.stringify(meta ?? {}),
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows.length ? exportRows : [{ created_at: "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "therapist_diary");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="therapist-diary.xlsx"`,
    },
  });
}
