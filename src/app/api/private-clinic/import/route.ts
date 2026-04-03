import { getAuthSession } from "@/lib/auth";
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

  const { imported, errors } = await importTherapyWorkbook({ householdId, workbook });

  return NextResponse.json({
    ok: true,
    imported,
    errors: errors.slice(0, 50),
    errorCount: errors.length,
  });
}
