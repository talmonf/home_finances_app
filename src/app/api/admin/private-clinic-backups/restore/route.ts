import { getAuthSession, prisma } from "@/lib/auth";
import { logGeneralAuditEvent } from "@/lib/general-audit";
import {
  applyPrivateClinicSnapshot,
  dryRunRestorePrivateClinicSnapshot,
  parseAndValidateSnapshotText,
} from "@/lib/private-clinic/backup-snapshot";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RestoreBody = {
  household_id?: string;
  mode?: "dry_run" | "apply";
  snapshot_id?: string;
  snapshot_json_text?: string;
};

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as RestoreBody;
  const householdId = body.household_id?.trim() ?? "";
  if (!householdId) return NextResponse.json({ error: "Missing household_id" }, { status: 400 });
  const mode = body.mode === "apply" ? "apply" : "dry_run";

  const snapshotText =
    body.snapshot_json_text ??
    (body.snapshot_id
      ? JSON.stringify(
          (
            await prisma.private_clinic_backup_snapshots.findUnique({
              where: { id: body.snapshot_id },
              select: { snapshot_json: true },
            })
          )?.snapshot_json ?? null,
        )
      : "");
  if (!snapshotText) return NextResponse.json({ error: "Missing snapshot payload" }, { status: 400 });

  await logGeneralAuditEvent({
    householdId,
    actorUserId: session.user.id,
    actorIsSuperAdmin: true,
    actorEmail: session.user.email,
    actorName: session.user.name,
    feature: "private_clinic_backup",
    action: mode === "apply" ? "restore_apply" : "restore_dry_run",
    status: "started",
    summary: `Restore ${mode} started`,
    metadata: { snapshotId: body.snapshot_id ?? null },
  });

  try {
    const parsed = parseAndValidateSnapshotText(snapshotText);
    const dryRun = await dryRunRestorePrivateClinicSnapshot(parsed, householdId);
    if (!dryRun.ok) {
      return NextResponse.json(
        { ok: false, error: "Snapshot household mismatch", expected: dryRun.expectedHouseholdId },
        { status: 400 },
      );
    }
    if (mode === "dry_run") {
      await logGeneralAuditEvent({
        householdId,
        actorUserId: session.user.id,
        actorIsSuperAdmin: true,
        actorEmail: session.user.email,
        actorName: session.user.name,
        feature: "private_clinic_backup",
        action: "restore_dry_run",
        status: "success",
        summary: "Restore dry-run completed",
        metadata: { tableCount: dryRun.tableNames.length, snapshotId: body.snapshot_id ?? null },
      });
      return NextResponse.json({ ok: true, mode, dryRun });
    }

    await applyPrivateClinicSnapshot(parsed, householdId);
    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: true,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_backup",
      action: "restore_apply",
      status: "success",
      summary: "Restore applied successfully",
      metadata: { tableCount: dryRun.tableNames.length, snapshotId: body.snapshot_id ?? null },
    });
    return NextResponse.json({ ok: true, mode, dryRun });
  } catch (error) {
    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: true,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_backup",
      action: mode === "apply" ? "restore_apply" : "restore_dry_run",
      status: "failed",
      summary: error instanceof Error ? error.message : String(error),
      metadata: { snapshotId: body.snapshot_id ?? null },
    });
    throw error;
  }
}
