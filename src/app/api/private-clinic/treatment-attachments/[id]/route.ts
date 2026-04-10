import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { deleteS3ObjectFromJobStorage } from "@/lib/object-storage";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: _req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const householdId = token.householdId as string | undefined;
    if (!householdId || token.isSuperAdmin) {
      return NextResponse.json({ error: "Household users only." }, { status: 403 });
    }

    const { id } = await context.params;
    const att = await prisma.therapy_treatment_attachments.findFirst({
      where: { id, household_id: householdId },
      select: { id: true, storage_bucket: true, storage_key: true },
    });

    if (!att) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

    try {
      await deleteS3ObjectFromJobStorage(att.storage_bucket, att.storage_key);
    } catch (e) {
      console.error("Failed to delete treatment attachment from S3 (record will still be removed):", e);
    }

    await prisma.therapy_treatment_attachments.deleteMany({
      where: { id: att.id, household_id: householdId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Treatment attachment delete failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    );
  }
}
