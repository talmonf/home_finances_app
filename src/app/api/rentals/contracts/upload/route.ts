import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { uploadRentalContractObject } from "@/lib/object-storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const householdId = token.householdId as string | undefined;
    if (!householdId || token.isSuperAdmin) {
      return NextResponse.json({ error: "Household users only." }, { status: 403 });
    }

    const formData = await req.formData();
    const rentalId = (formData.get("rental_id") as string | null)?.trim();
    const file = formData.get("file") as File | null;
    if (!rentalId || !file || file.size === 0) {
      return NextResponse.json({ error: "rental_id and file are required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 10 MB." }, { status: 400 });
    }

    const rental = await prisma.rentals.findFirst({
      where: { id: rentalId, household_id: householdId },
      select: { id: true, property_id: true },
    });
    if (!rental) return NextResponse.json({ error: "Rental not found" }, { status: 404 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await uploadRentalContractObject(
      householdId,
      rental.id,
      file.name,
      file.type,
      bytes,
    );

    const contract = await prisma.rental_contracts.create({
      data: {
        id: crypto.randomUUID(),
        household_id: householdId,
        rental_id: rental.id,
        file_name: file.name,
        mime_type: file.type || null,
        storage_bucket: stored.bucket,
        storage_key: stored.key,
        storage_url: stored.publicUrl,
      },
    });

    return NextResponse.json({
      id: contract.id,
      file_name: contract.file_name,
      storage_url: contract.storage_url,
      property_id: rental.property_id,
    });
  } catch (error) {
    console.error("Rental contract upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
