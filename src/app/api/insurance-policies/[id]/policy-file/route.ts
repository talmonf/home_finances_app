import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { deleteS3ObjectFromJobStorage, uploadInsurancePolicyFile } from "@/lib/object-storage";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

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

    const { id: policyId } = await context.params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 15 MB." }, { status: 400 });
    }

    const policy = await prisma.insurance_policies.findFirst({
      where: { id: policyId, household_id: householdId },
      select: {
        id: true,
        policy_storage_bucket: true,
        policy_storage_key: true,
      },
    });
    if (!policy) return NextResponse.json({ error: "Policy not found." }, { status: 404 });

    const expectedKeyPrefix = `${householdId}/insurance-policies/`;
    if (
      policy.policy_storage_bucket &&
      policy.policy_storage_key &&
      policy.policy_storage_key.startsWith(expectedKeyPrefix)
    ) {
      try {
        await deleteS3ObjectFromJobStorage(
          policy.policy_storage_bucket,
          policy.policy_storage_key,
        );
      } catch (e) {
        console.error("Failed to delete previous insurance policy file from S3:", e);
      }
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await uploadInsurancePolicyFile(
      householdId,
      policy.id,
      file.name || "policy",
      file.type,
      bytes,
    );

    await prisma.insurance_policies.update({
      where: { id: policy.id },
      data: {
        policy_file_name: file.name || "policy",
        policy_file_mime_type: file.type || null,
        policy_storage_bucket: stored.bucket,
        policy_storage_key: stored.key,
        policy_storage_url: stored.publicUrl,
        policy_file_uploaded_at: new Date(),
      },
    });

    revalidatePath(`/dashboard/insurance-policies/${policy.id}`);
    revalidatePath("/dashboard/private-clinic/clinic-insurance");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Insurance policy file upload failed:", error);
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

    const { id: policyId } = await context.params;

    const policy = await prisma.insurance_policies.findFirst({
      where: { id: policyId, household_id: householdId },
      select: {
        id: true,
        policy_storage_bucket: true,
        policy_storage_key: true,
      },
    });
    if (!policy) return NextResponse.json({ error: "Policy not found." }, { status: 404 });

    if (!policy.policy_storage_key) {
      return NextResponse.json({ ok: true });
    }

    const expectedKeyPrefix = `${householdId}/insurance-policies/`;
    if (!policy.policy_storage_key.startsWith(expectedKeyPrefix)) {
      return NextResponse.json({ error: "Invalid storage key." }, { status: 400 });
    }

    if (policy.policy_storage_bucket) {
      try {
        await deleteS3ObjectFromJobStorage(
          policy.policy_storage_bucket,
          policy.policy_storage_key,
        );
      } catch (e) {
        console.error("Failed to delete insurance policy file from S3:", e);
        return NextResponse.json({ error: "Could not delete file from storage." }, { status: 502 });
      }
    }

    await prisma.insurance_policies.update({
      where: { id: policy.id },
      data: {
        policy_file_name: null,
        policy_file_mime_type: null,
        policy_storage_bucket: null,
        policy_storage_key: null,
        policy_storage_url: null,
        policy_file_uploaded_at: null,
      },
    });

    revalidatePath(`/dashboard/insurance-policies/${policy.id}`);
    revalidatePath("/dashboard/private-clinic/clinic-insurance");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Insurance policy file delete failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    );
  }
}
