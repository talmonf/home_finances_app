import { getAuthSession, getCurrentHouseholdDateDisplayFormat, prisma } from "@/lib/auth";
import {
  insertPetrolFillupImportRows,
  loadPetrolImportMatrix,
  parsePetrolFillupImportMatrix,
  previewRowFromParsed,
} from "@/lib/petrol-fillups-import";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

type Variant = "household" | "private_clinic";

export async function POST(req: Request) {
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (!session?.user || !householdId || session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const car_id = String(form.get("car_id") ?? "").trim();
  if (!car_id) {
    return NextResponse.json({ error: "Missing car_id" }, { status: 400 });
  }

  const variantRaw = String(form.get("variant") ?? "household").trim().toLowerCase();
  const variant: Variant = variantRaw === "private_clinic" ? "private_clinic" : "household";

  const modeRaw = String(form.get("mode") ?? "preview").trim().toLowerCase();
  const mode = modeRaw === "commit" ? "commit" : "preview";

  const sheetName = String(form.get("sheet_name") ?? "").trim() || null;

  const car = await prisma.cars.findFirst({
    where: { id: car_id, household_id: householdId, is_active: true },
    select: { id: true },
  });
  if (!car) {
    return NextResponse.json({ error: "Invalid car" }, { status: 400 });
  }

  const dateFormat = await getCurrentHouseholdDateDisplayFormat();
  const ab = await file.arrayBuffer();

  let loaded: ReturnType<typeof loadPetrolImportMatrix>;
  try {
    loaded = loadPetrolImportMatrix(ab, sheetName);
  } catch {
    return NextResponse.json({ error: "Could not read file" }, { status: 400 });
  }

  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: "empty_workbook", message: "The workbook has no sheets." });
  }

  const parsed = parsePetrolFillupImportMatrix(loaded.matrix, dateFormat);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, fatalErrors: parsed.fatalErrors, activeSheet: loaded.activeSheet },
      { status: 400 },
    );
  }

  const sampleRows = parsed.rows.slice(0, 40).map(previewRowFromParsed);
  const canCommit = parsed.rowErrors.length === 0 && parsed.rows.length > 0;

  if (mode === "preview") {
    return NextResponse.json({
      ok: true,
      mode: "preview",
      rowCount: parsed.rows.length,
      rowErrors: parsed.rowErrors,
      sampleRows,
      canCommit,
      activeSheet: loaded.activeSheet,
      sheetNames: loaded.sheetNames,
      sheetWarning: loaded.usedDefaultSheet
        ? `Multiple sheets in file — preview uses "${loaded.activeSheet}". Pick another sheet below and analyze again if needed.`
        : null,
    });
  }

  if (!canCommit) {
    return NextResponse.json(
      {
        ok: false,
        error: "commit_blocked",
        message: "Fix all row errors before importing, or upload a corrected file.",
        rowErrors: parsed.rowErrors,
        rowCount: parsed.rows.length,
      },
      { status: 400 },
    );
  }

  const n = await insertPetrolFillupImportRows(prisma, householdId, car_id, parsed.rows);
  revalidatePath("/dashboard/petrol-fillups");
  revalidatePath(`/dashboard/cars/${car_id}`);
  if (variant === "private_clinic") {
    revalidatePath("/dashboard/private-clinic/petrol");
  }

  return NextResponse.json({
    ok: true,
    mode: "commit",
    imported: n,
    activeSheet: loaded.activeSheet,
  });
}
