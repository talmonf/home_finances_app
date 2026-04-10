import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { uploadTherapyTreatmentAttachment } from "@/lib/object-storage";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ treatmentId: string }> },
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const householdId = token.householdId as string | undefined;
    if (!householdId || token.isSuperAdmin) {
      return NextResponse.json({ error: "Household users only." }, { status: 403 });
    }

    const { treatmentId } = await context.params;
    if (!treatmentId?.trim()) {
      return NextResponse.json({ error: "treatmentId required" }, { status: 400 });
    }

    const treatment = await prisma.therapy_treatments.findFirst({
      where: { id: treatmentId, household_id: householdId },
      select: { id: true },
    });
    if (!treatment) return NextResponse.json({ error: "Treatment not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 25 MB." }, { status: 400 });
    }

    const attachmentId = crypto.randomUUID();
    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    const stored = await uploadTherapyTreatmentAttachment(
      householdId,
      treatment.id,
      attachmentId,
      file.name,
      mimeType,
      bytes,
    );

    const row = await prisma.therapy_treatment_attachments.create({
      data: {
        id: attachmentId,
        household_id: householdId,
        treatment_id: treatment.id,
        file_name: file.name,
        mime_type: mimeType,
        byte_size: bytes.length,
        storage_bucket: stored.bucket,
        storage_key: stored.key,
      },
    });

    return NextResponse.json({
      id: row.id,
      file_name: row.file_name,
      mime_type: row.mime_type,
      byte_size: row.byte_size,
      transcription_status: row.transcription_status,
    });
  } catch (error) {
    console.error("Treatment attachment upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
