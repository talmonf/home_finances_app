import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { getJobDocumentStorageConfig, getStorageDebugMeta } from "@/lib/object-storage";

const HEAD_RETRY_DELAYS_MS = [200, 400, 800, 1200] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    let body: {
      attachmentId?: string;
      fileName?: string;
      mimeType?: string;
      byteSize?: number;
      storageBucket?: string;
      storageKey?: string;
    } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "JSON body required" }, { status: 400 });
    }

    const attachmentId = body.attachmentId?.trim();
    const fileName = body.fileName?.trim();
    const mimeType = body.mimeType?.trim() || "application/octet-stream";
    const byteSize = Number(body.byteSize);
    const storageBucket = body.storageBucket?.trim();
    const storageKey = body.storageKey?.trim();
    if (!attachmentId || !fileName || !storageBucket || !storageKey) {
      return NextResponse.json(
        { error: "attachmentId, fileName, storageBucket and storageKey are required" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(byteSize) || byteSize <= 0) {
      return NextResponse.json({ error: "byteSize must be a positive number" }, { status: 400 });
    }

    const expectedPrefix = `${householdId}/therapy-treatments/${treatment.id}/${attachmentId}-`;
    if (!storageKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid storageKey" }, { status: 400 });
    }

    const cfg = getJobDocumentStorageConfig();
    if (storageBucket !== cfg.bucket) {
      return NextResponse.json({ error: "Invalid storageBucket" }, { status: 400 });
    }
    console.info(
      "Storage debug:",
      getStorageDebugMeta({
        op: "treatment-attachment-upload-complete-head",
        bucket: storageBucket,
        key: storageKey,
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

    let objectFound = false;
    for (let attempt = 0; attempt <= HEAD_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: storageBucket, Key: storageKey }));
        objectFound = true;
        break;
      } catch {
        if (attempt < HEAD_RETRY_DELAYS_MS.length) {
          await sleep(HEAD_RETRY_DELAYS_MS[attempt]);
          continue;
        }
      }
    }

    if (!objectFound) {
      console.warn(
        "Storage debug: head object failed",
        getStorageDebugMeta({
          op: "treatment-attachment-upload-complete-head-miss",
          bucket: storageBucket,
          key: storageKey,
          region: cfg.region,
          endpoint: cfg.endpoint,
          forcePathStyle: cfg.forcePathStyle,
        }),
      );
      return NextResponse.json({ error: "Uploaded object not found in storage yet." }, { status: 409 });
    }

    await prisma.therapy_treatment_attachments.upsert({
      where: { id: attachmentId },
      update: {
        file_name: fileName,
        mime_type: mimeType,
        byte_size: byteSize,
        storage_bucket: storageBucket,
        storage_key: storageKey,
      },
      create: {
        id: attachmentId,
        household_id: householdId,
        treatment_id: treatment.id,
        file_name: fileName,
        mime_type: mimeType,
        byte_size: byteSize,
        storage_bucket: storageBucket,
        storage_key: storageKey,
      },
    });

    return NextResponse.json({ ok: true, attachmentId });
  } catch (error) {
    console.error("Treatment attachment direct upload complete failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}

