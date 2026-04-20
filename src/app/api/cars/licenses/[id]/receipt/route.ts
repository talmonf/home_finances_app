import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { deleteS3ObjectFromJobStorage, uploadCarLicenseReceipt } from "@/lib/object-storage";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(
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

    const { id: licenseId } = await context.params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 10 MB." }, { status: 400 });
    }

    const license = await prisma.car_licenses.findFirst({
      where: { id: licenseId, household_id: householdId },
      select: {
        id: true,
        car_id: true,
        receipt_storage_bucket: true,
        receipt_storage_key: true,
      },
    });
    if (!license) return NextResponse.json({ error: "License not found." }, { status: 404 });

    const expectedKeyPrefix = `${householdId}/car-licenses/`;
    if (
      license.receipt_storage_bucket &&
      license.receipt_storage_key &&
      license.receipt_storage_key.startsWith(expectedKeyPrefix)
    ) {
      try {
        await deleteS3ObjectFromJobStorage(
          license.receipt_storage_bucket,
          license.receipt_storage_key,
        );
      } catch (e) {
        console.error("Failed to delete previous car license receipt from S3:", e);
      }
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await uploadCarLicenseReceipt(
      householdId,
      license.id,
      file.name || "receipt",
      file.type,
      bytes,
    );

    await prisma.car_licenses.updateMany({
      where: { id: license.id, household_id: householdId },
      data: {
        receipt_file_name: file.name || "receipt",
        receipt_mime_type: file.type || null,
        receipt_storage_bucket: stored.bucket,
        receipt_storage_key: stored.key,
        receipt_storage_url: stored.publicUrl,
        receipt_uploaded_at: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Car license receipt upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const { id: licenseId } = await context.params;

    const license = await prisma.car_licenses.findFirst({
      where: { id: licenseId, household_id: householdId },
      select: {
        id: true,
        receipt_storage_bucket: true,
        receipt_storage_key: true,
      },
    });
    if (!license) return NextResponse.json({ error: "License not found." }, { status: 404 });

    if (!license.receipt_storage_key) {
      return NextResponse.json({ ok: true });
    }

    const expectedKeyPrefix = `${householdId}/car-licenses/`;
    if (!license.receipt_storage_key.startsWith(expectedKeyPrefix)) {
      return NextResponse.json({ error: "Invalid storage key." }, { status: 400 });
    }

    if (license.receipt_storage_bucket) {
      try {
        await deleteS3ObjectFromJobStorage(
          license.receipt_storage_bucket,
          license.receipt_storage_key,
        );
      } catch (e) {
        console.error("Failed to delete car license receipt from S3:", e);
        return NextResponse.json({ error: "Could not delete file from storage." }, { status: 502 });
      }
    }

    await prisma.car_licenses.updateMany({
      where: { id: license.id, household_id: householdId },
      data: {
        receipt_file_name: null,
        receipt_mime_type: null,
        receipt_storage_bucket: null,
        receipt_storage_key: null,
        receipt_storage_url: null,
        receipt_uploaded_at: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Car license receipt delete failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    );
  }
}
