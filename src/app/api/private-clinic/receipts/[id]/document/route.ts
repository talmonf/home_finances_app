import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { getJobDocumentStorageConfig } from "@/lib/object-storage";

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

    const { id: receiptId } = await context.params;
    const row = await prisma.therapy_receipts.findFirst({
      where: { id: receiptId, household_id: householdId },
      select: {
        document_file_name: true,
        document_mime_type: true,
        document_storage_bucket: true,
        document_storage_key: true,
      },
    });

    if (!row) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    if (!row.document_storage_bucket || !row.document_storage_key) {
      return NextResponse.json({ error: "No document stored for this receipt." }, { status: 404 });
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

    const object = await client.send(
      new GetObjectCommand({
        Bucket: row.document_storage_bucket,
        Key: row.document_storage_key,
      }),
    );

    const body = await object.Body?.transformToByteArray();
    if (!body) {
      return NextResponse.json({ error: "Empty document." }, { status: 404 });
    }

    const fileName = row.document_file_name || "receipt.pdf";
    const mimeType = row.document_mime_type || "application/pdf";

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("therapy receipt document download", err);
    return NextResponse.json({ error: "Download failed." }, { status: 500 });
  }
}
