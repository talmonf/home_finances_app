import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/auth";
import { uploadCarLicenseReceipt } from "@/lib/object-storage";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function parseDateInput(raw: string | null): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMoney(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const householdId = token.householdId as string | undefined;
    if (!householdId || token.isSuperAdmin) {
      return NextResponse.json({ error: "Household users only." }, { status: 403 });
    }

    const formData = await req.formData();
    const car_id = (formData.get("car_id") as string | null)?.trim() || null;
    const expires_at = parseDateInput((formData.get("expires_at") as string | null)?.trim() || null);
    if (!car_id || !expires_at) {
      return NextResponse.json({ error: "Car and expiry date are required." }, { status: 400 });
    }

    const car = await prisma.cars.findFirst({
      where: { id: car_id, household_id: householdId },
      select: { id: true },
    });
    if (!car) return NextResponse.json({ error: "Car not found." }, { status: 404 });

    const credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
    const bank_account_id = (formData.get("bank_account_id") as string | null)?.trim() || null;
    if (credit_card_id) {
      const ok = await prisma.credit_cards.findFirst({
        where: { id: credit_card_id, household_id: householdId },
        select: { id: true },
      });
      if (!ok) return NextResponse.json({ error: "Invalid credit card." }, { status: 400 });
    }
    if (bank_account_id) {
      const ok = await prisma.bank_accounts.findFirst({
        where: { id: bank_account_id, household_id: householdId },
        select: { id: true },
      });
      if (!ok) return NextResponse.json({ error: "Invalid bank account." }, { status: 400 });
    }

    const file = formData.get("receipt") as File | null;
    if (file && file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Receipt file too large. Max 10 MB." }, { status: 400 });
    }

    const licenseId = crypto.randomUUID();
    await prisma.car_licenses.create({
      data: {
        id: licenseId,
        household_id: householdId,
        car_id,
        renewed_at: parseDateInput((formData.get("renewed_at") as string | null)?.trim() || null),
        expires_at,
        cost_amount: parseMoney((formData.get("cost_amount") as string | null) ?? null),
        credit_card_id,
        bank_account_id,
        notes: (formData.get("notes") as string | null)?.trim() || null,
      },
    });

    if (file && file.size > 0) {
      try {
        const bytes = Buffer.from(await file.arrayBuffer());
        const stored = await uploadCarLicenseReceipt(
          householdId,
          licenseId,
          file.name || "receipt",
          file.type,
          bytes,
        );
        await prisma.car_licenses.update({
          where: { id: licenseId },
          data: {
            receipt_file_name: file.name || "receipt",
            receipt_mime_type: file.type || null,
            receipt_storage_bucket: stored.bucket,
            receipt_storage_key: stored.key,
            receipt_storage_url: stored.publicUrl,
            receipt_uploaded_at: new Date(),
          },
        });
      } catch (uploadOrReceiptErr) {
        await prisma.car_licenses.deleteMany({ where: { id: licenseId, household_id: householdId } });
        throw uploadOrReceiptErr;
      }
    }

    return NextResponse.json({ id: licenseId });
  } catch (error) {
    console.error("Car license create failed:", error);
    const message = formatApiError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function formatApiError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2022") {
      return "Database is missing receipt columns. Run migration 047_car_licenses_receipt.sql (or prisma migrate), then try again.";
    }
    return `Database error (${error.code}): ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Create failed";
}
