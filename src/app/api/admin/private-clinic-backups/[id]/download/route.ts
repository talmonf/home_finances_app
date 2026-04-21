import { getAuthSession, prisma } from "@/lib/auth";
import { logGeneralAuditEvent } from "@/lib/general-audit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const backup = await prisma.private_clinic_backup_snapshots.findUnique({
    where: { id },
    select: { id: true, household_id: true, snapshot_json: true, snapshot_checksum: true },
  });
  if (!backup) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logGeneralAuditEvent({
    householdId: backup.household_id,
    actorUserId: session.user.id,
    actorIsSuperAdmin: true,
    actorEmail: session.user.email,
    actorName: session.user.name,
    feature: "private_clinic_backup",
    action: "download_snapshot",
    status: "success",
    summary: `Downloaded snapshot ${backup.id}`,
    metadata: { backupId: backup.id, checksum: backup.snapshot_checksum },
  });

  const text = JSON.stringify(backup.snapshot_json);
  const filename = `private-clinic-backup-${backup.household_id.slice(0, 8)}-${backup.id.slice(0, 8)}.json`;
  return new NextResponse(text, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
