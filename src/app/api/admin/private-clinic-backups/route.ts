import { getAuthSession, prisma } from "@/lib/auth";
import { logGeneralAuditEvent } from "@/lib/general-audit";
import { buildPrivateClinicSnapshot, PRIVATE_CLINIC_BACKUP_VERSION } from "@/lib/private-clinic/backup-snapshot";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const householdId = searchParams.get("household_id")?.trim() ?? "";
  if (!householdId) return NextResponse.json({ error: "Missing household_id" }, { status: 400 });

  const backups = await prisma.private_clinic_backup_snapshots.findMany({
    where: { household_id: householdId },
    orderBy: { created_at: "desc" },
    take: 100,
    select: {
      id: true,
      household_id: true,
      snapshot_version: true,
      snapshot_checksum: true,
      snapshot_bytes: true,
      notes: true,
      created_by_super_admin_email: true,
      created_at: true,
    },
  });
  return NextResponse.json({ ok: true, backups });
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { household_id?: string; notes?: string };
  const householdId = body.household_id?.trim() ?? "";
  if (!householdId) return NextResponse.json({ error: "Missing household_id" }, { status: 400 });

  await logGeneralAuditEvent({
    householdId,
    actorUserId: session.user.id,
    actorIsSuperAdmin: true,
    actorEmail: session.user.email,
    actorName: session.user.name,
    feature: "private_clinic_backup",
    action: "create_snapshot",
    status: "started",
    summary: "Private clinic backup snapshot started",
  });

  try {
    const { payload, payloadText, checksum } = await buildPrivateClinicSnapshot(householdId);
    const created = await prisma.private_clinic_backup_snapshots.create({
      data: {
        household_id: householdId,
        created_by_user_id: null,
        created_by_super_admin_email: session.user.email ?? null,
        snapshot_version: PRIVATE_CLINIC_BACKUP_VERSION,
        snapshot_checksum: checksum,
        snapshot_bytes: Buffer.byteLength(payloadText, "utf8"),
        snapshot_json: payload,
        notes: body.notes?.trim() || null,
      },
      select: { id: true, created_at: true, snapshot_checksum: true, snapshot_bytes: true },
    });
    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: true,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_backup",
      action: "create_snapshot",
      status: "success",
      summary: `Backup snapshot created (${created.id})`,
      metadata: { backupId: created.id, bytes: created.snapshot_bytes, checksum: created.snapshot_checksum },
    });
    return NextResponse.json({ ok: true, backup: created });
  } catch (error) {
    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: true,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_backup",
      action: "create_snapshot",
      status: "failed",
      summary: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
