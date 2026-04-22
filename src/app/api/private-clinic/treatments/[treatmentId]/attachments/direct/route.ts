import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { getJobDocumentStorageConfig, getStorageDebugMeta } from "@/lib/object-storage";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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

    let body: { fileName?: string; mimeType?: string; byteSize?: number } = {};
    try {
      body = (await req.json()) as { fileName?: string; mimeType?: string; byteSize?: number };
    } catch {
      return NextResponse.json({ error: "JSON body required" }, { status: 400 });
    }

    const fileName = body.fileName?.trim();
    const mimeType = body.mimeType?.trim() || "application/octet-stream";
    const byteSize = Number(body.byteSize);
    if (!fileName) return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    if (!Number.isFinite(byteSize) || byteSize <= 0) {
      return NextResponse.json({ error: "byteSize must be a positive number" }, { status: 400 });
    }
    if (byteSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 25 MB." }, { status: 400 });
    }

    const attachmentId = crypto.randomUUID();
    const safeFileName = sanitizeFileName(fileName);
    const cfg = getJobDocumentStorageConfig();
    const key = `${householdId}/therapy-treatments/${treatment.id}/${attachmentId}-${safeFileName}`;
    console.info(
      "Storage debug:",
      getStorageDebugMeta({
        op: "treatment-attachment-upload-init",
        bucket: cfg.bucket,
        key,
        region: cfg.region,
        endpoint: cfg.endpoint,
        forcePathStyle: cfg.forcePathStyle,
      }),
    );
    const client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: cfg.forcePathStyle,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });

    const uploadPost = await createPresignedPost(client, {
      Bucket: cfg.bucket,
      Key: key,
      Expires: 600,
      Conditions: [
        ["content-length-range", 1, MAX_FILE_SIZE],
        ["eq", "$Content-Type", mimeType],
      ],
      Fields: {
        "Content-Type": mimeType,
      },
    });

    await prisma.therapy_treatment_attachments.create({
      data: {
        id: attachmentId,
        household_id: householdId,
        treatment_id: treatment.id,
        file_name: fileName,
        mime_type: mimeType,
        byte_size: byteSize,
        storage_bucket: cfg.bucket,
        storage_key: key,
      },
    });

    return NextResponse.json({
      attachmentId,
      uploadUrl: uploadPost.url,
      uploadMethod: "POST",
      uploadFields: uploadPost.fields,
      fileName,
      mimeType,
      byteSize,
      storageBucket: cfg.bucket,
      storageKey: key,
    });
  } catch (error) {
    console.error("Treatment attachment direct upload init failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}

