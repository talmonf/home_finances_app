import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";

function getJobDocumentStorageConfig(): {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string | undefined;
  forcePathStyle: boolean;
} {
  const region =
    process.env.JOB_STORAGE_REGION?.trim() || process.env.RENTAL_STORAGE_REGION?.trim();
  const accessKeyId =
    process.env.JOB_STORAGE_ACCESS_KEY_ID?.trim() ||
    process.env.RENTAL_STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.JOB_STORAGE_SECRET_ACCESS_KEY?.trim() ||
    process.env.RENTAL_STORAGE_SECRET_ACCESS_KEY?.trim();

  if (!region) throw new Error("JOB_STORAGE_REGION or RENTAL_STORAGE_REGION is not configured");
  if (!accessKeyId)
    throw new Error("JOB_STORAGE_ACCESS_KEY_ID or RENTAL_STORAGE_ACCESS_KEY_ID is not configured");
  if (!secretAccessKey)
    throw new Error(
      "JOB_STORAGE_SECRET_ACCESS_KEY or RENTAL_STORAGE_SECRET_ACCESS_KEY is not configured",
    );

  const endpoint =
    process.env.JOB_STORAGE_ENDPOINT?.trim() || process.env.RENTAL_STORAGE_ENDPOINT?.trim();

  const jobForce = process.env.JOB_STORAGE_FORCE_PATH_STYLE;
  const rentalForce = process.env.RENTAL_STORAGE_FORCE_PATH_STYLE;
  const forcePathStyle =
    jobForce === "true" || (jobForce === undefined && rentalForce === "true");

  return { region, accessKeyId, secretAccessKey, endpoint, forcePathStyle };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const householdId = token.householdId as string | undefined;
    if (!householdId || token.isSuperAdmin) {
      return NextResponse.json({ error: "Household users only." }, { status: 403 });
    }

    const { id: serviceId } = await context.params;
    const row = await prisma.car_services.findFirst({
      where: { id: serviceId, household_id: householdId },
      select: {
        receipt_file_name: true,
        receipt_mime_type: true,
        receipt_storage_bucket: true,
        receipt_storage_key: true,
      },
    });

    if (!row) return NextResponse.json({ error: "Service not found." }, { status: 404 });
    if (!row.receipt_storage_bucket || !row.receipt_storage_key) {
      return NextResponse.json({ error: "No file uploaded for this service." }, { status: 404 });
    }

    const cfg = getJobDocumentStorageConfig();
    const client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: cfg.forcePathStyle,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });

    const result = await client.send(
      new GetObjectCommand({
        Bucket: row.receipt_storage_bucket,
        Key: row.receipt_storage_key,
      }),
    );

    const body = result.Body;
    if (!body) return NextResponse.json({ error: "Empty file body" }, { status: 404 });

    const fileName = row.receipt_file_name || "service-details";
    const escapedFileName = fileName.replace(/"/g, '\\"');
    const disposition = req.nextUrl.searchParams.get("disposition");
    const inline = disposition === "inline";
    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename="${escapedFileName}"`,
    );
    headers.set("Content-Type", row.receipt_mime_type || "application/octet-stream");
    headers.set("Cache-Control", "private, no-store");

    if (body instanceof Uint8Array) {
      return new NextResponse(Buffer.from(body), { headers });
    }

    const arrayBufferFn = (body as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer;
    if (typeof arrayBufferFn === "function") {
      const ab = await arrayBufferFn.call(body as unknown);
      return new NextResponse(Buffer.from(ab), { headers });
    }

    const chunks: Buffer[] = [];
    const iterable = body as unknown as AsyncIterable<Uint8Array | Buffer>;
    for await (const chunk of iterable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return new NextResponse(Buffer.concat(chunks), { headers });
  } catch (error) {
    console.error("Car service download failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 },
    );
  }
}
