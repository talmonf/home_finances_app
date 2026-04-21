import { getAuthSession } from "@/lib/auth";
import { logGeneralAuditEvent } from "@/lib/general-audit";
import { importTherapyWorkbook } from "@/lib/therapy/import-workbook";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (!session?.user || !householdId || session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buf, { type: "buffer" });
  await logGeneralAuditEvent({
    householdId,
    actorUserId: session.user.id,
    actorIsSuperAdmin: false,
    actorEmail: session.user.email,
    actorName: session.user.name,
    feature: "private_clinic_excel",
    action: "import",
    status: "started",
    summary: "Private clinic Excel import started",
  });
  try {
    const { imported, errors } = await importTherapyWorkbook({ householdId, workbook });
    const ok = errors.length === 0;
    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: false,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_excel",
      action: "import",
      status: ok ? "success" : "failed",
      summary: ok ? "Private clinic Excel import completed" : "Private clinic Excel import finished with errors",
      metadata: { imported, errorCount: errors.length },
    });
    return NextResponse.json({
      ok,
      imported,
      errors: errors.slice(0, 50),
      errorCount: errors.length,
    });
  } catch (error) {
    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: false,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_excel",
      action: "import",
      status: "failed",
      summary: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
