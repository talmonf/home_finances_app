import { getAuthSession, prisma } from "@/lib/auth";
import { uploadTherapyExpenseImage } from "@/lib/object-storage";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (!session?.user || !householdId || session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const expenseId = String(form.get("expense_id") ?? "").trim();
  const file = form.get("file");
  if (!expenseId || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing expense_id or file" }, { status: 400 });
  }

  const expense = await prisma.therapy_job_expenses.findFirst({
    where: { id: expenseId, household_id: householdId },
  });
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const fname = (file as File).name || "upload";
  const mime = (file as File).type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  let uploaded;
  try {
    uploaded = await uploadTherapyExpenseImage(householdId, expenseId, fname, mime, buffer);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    );
  }

  await prisma.therapy_job_expenses.updateMany({
    where: { id: expenseId, household_id: householdId },
    data: {
      image_file_name: fname,
      image_mime_type: mime,
      image_storage_bucket: uploaded.bucket,
      image_storage_key: uploaded.key,
      image_storage_url: uploaded.publicUrl,
    },
  });

  return NextResponse.json({ ok: true });
}
