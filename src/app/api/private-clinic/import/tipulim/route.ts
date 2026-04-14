import { getAuthSession } from "@/lib/auth";
import { analyzeTipulimImport, commitTipulimImport } from "@/lib/therapy/import-tipulim";
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
  const jobId = String(form.get("job_id") ?? "").trim();
  if (!jobId) return NextResponse.json({ error: "Missing job_id" }, { status: 400 });
  const selectedProgramId = String(form.get("program_id") ?? "").trim() || null;
  const profileRaw = String(form.get("profile") ?? "tipulim_private").trim();
  const profile =
    profileRaw === "tipulim_org_monthly" ? "tipulim_org_monthly" : "tipulim_private";
  const mode = String(form.get("mode") ?? "preview").trim();
  const sheetName = String(form.get("sheet_name") ?? "").trim() || null;
  const missingVisitTypeRaw = String(form.get("missing_visit_type") ?? "").trim();
  const missingVisitType =
    missingVisitTypeRaw === "clinic" ||
    missingVisitTypeRaw === "home" ||
    missingVisitTypeRaw === "phone" ||
    missingVisitTypeRaw === "video"
      ? missingVisitTypeRaw
      : null;
  const clientResolutionsRaw = String(form.get("client_resolutions") ?? "").trim();
  let clientResolutions: Record<string, string> | undefined = undefined;
  if (clientResolutionsRaw) {
    try {
      clientResolutions = JSON.parse(clientResolutionsRaw) as Record<string, string>;
    } catch {
      return NextResponse.json({ error: "Bad client_resolutions JSON" }, { status: 400 });
    }
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheetNames = workbook.SheetNames ?? [];
  if (!sheetName && sheetNames.length > 1) {
    return NextResponse.json({
      ok: false,
      error: "sheet_selection_required",
      sheetNames,
      message: "Workbook has multiple sheets. Select one to continue.",
    });
  }
  if (sheetName && !sheetNames.includes(sheetName)) {
    return NextResponse.json({ error: "Invalid sheet_name" }, { status: 400 });
  }

  if (mode === "commit") {
    const result = await commitTipulimImport({
      householdId,
      jobId,
      selectedProgramId,
      profile,
      workbook,
      sheetName,
      missingVisitType,
      clientResolutions,
    });
    return NextResponse.json({ ok: result.blockingErrors.length === 0, ...result });
  }

  const result = await analyzeTipulimImport({
    householdId,
    jobId,
    selectedProgramId,
    profile,
    workbook,
    sheetName,
    missingVisitType,
    clientResolutions,
  });
  return NextResponse.json({ ok: true, ...result });
}

