import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/auth";
import { logGeneralAuditEvent } from "@/lib/general-audit";
import { analyzeTipulimImport, commitTipulimImport } from "@/lib/therapy/import-tipulim";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function summarizeBlockingErrorsForAudit(errors: string[]): string {
  if (errors.length === 0) return "";
  const rows: string[] = [];
  let unlinked = 0;
  let mismatch = 0;
  let other = 0;
  for (const e of errors) {
    const rowMatch = e.match(/Row\s+(\d+)/i);
    if (rowMatch?.[1]) rows.push(rowMatch[1]);
    if (e.includes("could not be linked to any treatments")) unlinked += 1;
    else if (e.includes("does not match allocations") || e.includes("does not match linked treatments")) mismatch += 1;
    else other += 1;
  }
  const rowSummary = rows.length > 0 ? ` Rows: ${Array.from(new Set(rows)).slice(0, 10).join(", ")}.` : "";
  return `Blocking validation errors=${errors.length} (unlinked=${unlinked}, allocationMismatch=${mismatch}, other=${other}).${rowSummary}`;
}

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
    profileRaw === "tipulim_org_monthly"
      ? "tipulim_org_monthly"
      : profileRaw === "tipulim_receipts_only"
        ? "tipulim_receipts_only"
        : "tipulim_private";
  const usualTreatmentCostRaw = String(form.get("usual_treatment_cost") ?? "").trim();
  const usualTreatmentCost = usualTreatmentCostRaw || null;
  const usualTreatmentCostCurrencyRaw = String(form.get("usual_treatment_cost_currency") ?? "").trim().toUpperCase();
  const usualTreatmentCostCurrency = usualTreatmentCostCurrencyRaw || null;
  const saveUsualTreatmentCostDefault =
    String(form.get("save_usual_treatment_cost_default") ?? "").toLowerCase() === "1" ||
    String(form.get("save_usual_treatment_cost_default") ?? "").toLowerCase() === "true";
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
    await logGeneralAuditEvent({
      householdId,
      actorUserId: session.user.id,
      actorIsSuperAdmin: false,
      actorEmail: session.user.email,
      actorName: session.user.name,
      feature: "private_clinic_excel",
      action: "tipulim_commit_import",
      status: "started",
      summary: "Tipulim commit import started",
      metadata: { profile, jobId, sheetName },
    });
    const startedAtMs = Date.now();
    const audit = await prisma.therapy_import_audits.create({
      data: {
        id: crypto.randomUUID(),
        household_id: householdId,
        user_id: session.user.id,
        status: "in_progress",
        profile,
        job_id: jobId,
        selected_program_id: selectedProgramId,
        sheet_name: sheetName,
        started_at: new Date(startedAtMs),
      },
      select: { id: true },
    });
    try {
      const result = await commitTipulimImport({
        householdId,
        jobId,
        selectedProgramId,
        profile,
        workbook,
        sheetName,
        missingVisitType,
        clientResolutions,
        usualTreatmentCost,
      });
      const completedAtMs = Date.now();
      const durationMs = completedAtMs - startedAtMs;
      const success = result.blockingErrors.length === 0;
      if (success && usualTreatmentCostCurrency && profile === "tipulim_receipts_only") {
        await prisma.users.updateMany({
          where: { id: session.user.id, household_id: householdId },
          data: { default_currency: usualTreatmentCostCurrency },
        });
      }
      if (success && saveUsualTreatmentCostDefault && usualTreatmentCost && profile === "tipulim_receipts_only") {
        await prisma.therapy_settings.upsert({
          where: { household_id: householdId },
          create: {
            household_id: householdId,
            usual_treatment_cost_for_import: usualTreatmentCost,
            usual_treatment_cost_currency_for_import: usualTreatmentCostCurrency,
          },
          update: {
            usual_treatment_cost_for_import: usualTreatmentCost,
            usual_treatment_cost_currency_for_import: usualTreatmentCostCurrency,
          },
        });
      }
      const failureMessage = success
        ? null
        : summarizeBlockingErrorsForAudit(result.blockingErrors).slice(0, 2000);

      await prisma.therapy_import_audits.update({
        where: { id: audit.id },
        data: {
          status: success ? "successful" : "failed",
          completed_at: new Date(completedAtMs),
          duration_ms: durationMs,
          created_clients: result.created.clients,
          created_treatments: result.created.treatments,
          created_receipts: result.created.receipts,
          created_allocations: result.created.allocations,
          created_consultations: result.created.consultations,
          created_travel: result.created.travel,
          created_programs: result.created.programs,
          created_consultation_allocations: result.created.consultationAllocations,
          created_travel_allocations: result.created.travelAllocations,
          blocking_errors_count: result.blockingErrors.length,
          warnings_count: result.warnings.length,
          failure_message: failureMessage,
        },
      });
      await logGeneralAuditEvent({
        householdId,
        actorUserId: session.user.id,
        actorIsSuperAdmin: false,
        actorEmail: session.user.email,
        actorName: session.user.name,
        feature: "private_clinic_excel",
        action: "tipulim_commit_import",
        status: success ? "success" : "failed",
        summary: success ? "Tipulim commit import completed" : "Tipulim commit import completed with blocking errors",
        metadata: {
          profile,
          jobId,
          sheetName,
          blockingErrors: result.blockingErrors.length,
          warnings: result.warnings.length,
        },
      });

      return NextResponse.json({
        ok: success,
        durationMs,
        completedAtIso: new Date(completedAtMs).toISOString(),
        auditId: audit.id,
        ...result,
      });
    } catch (error) {
      const completedAtMs = Date.now();
      const durationMs = completedAtMs - startedAtMs;
      const failureMessage = error instanceof Error ? error.message : String(error);
      await prisma.therapy_import_audits.update({
        where: { id: audit.id },
        data: {
          status: "failed",
          completed_at: new Date(completedAtMs),
          duration_ms: durationMs,
          failure_message: failureMessage.slice(0, 2000),
        },
      });
      await logGeneralAuditEvent({
        householdId,
        actorUserId: session.user.id,
        actorIsSuperAdmin: false,
        actorEmail: session.user.email,
        actorName: session.user.name,
        feature: "private_clinic_excel",
        action: "tipulim_commit_import",
        status: "failed",
        summary: error instanceof Error ? error.message : String(error),
        metadata: { profile, jobId, sheetName },
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Import commit failed",
          message: failureMessage,
        },
        { status: 500 },
      );
    }
  }

  await logGeneralAuditEvent({
    householdId,
    actorUserId: session.user.id,
    actorIsSuperAdmin: false,
    actorEmail: session.user.email,
    actorName: session.user.name,
    feature: "private_clinic_excel",
    action: "tipulim_preview_import",
    status: "started",
    summary: "Tipulim preview import started",
    metadata: { profile, jobId, sheetName },
  });
  const result = await analyzeTipulimImport({
    householdId,
    jobId,
    selectedProgramId,
    profile,
    workbook,
    sheetName,
    missingVisitType,
    clientResolutions,
    usualTreatmentCost,
  });
  await logGeneralAuditEvent({
    householdId,
    actorUserId: session.user.id,
    actorIsSuperAdmin: false,
    actorEmail: session.user.email,
    actorName: session.user.name,
    feature: "private_clinic_excel",
    action: "tipulim_preview_import",
    status: "success",
    summary: "Tipulim preview import completed",
    metadata: {
      profile,
      jobId,
      sheetName,
      blockingErrors: result.blockingErrors.length,
      warnings: result.warnings.length,
    },
  });
  return NextResponse.json({ ok: true, ...result });
}

