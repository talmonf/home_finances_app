import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { uploadJobDocumentObject } from "@/lib/object-storage";

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
    const jobId = (formData.get("job_id") as string | null)?.trim();
    const file = formData.get("file") as File | null;
    if (!jobId || !file || file.size === 0) {
      return NextResponse.json({ error: "job_id and file are required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 10 MB." }, { status: 400 });
    }

    const job = await prisma.jobs.findFirst({
      where: { id: jobId, household_id: householdId },
      select: { id: true },
    });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await uploadJobDocumentObject(
      householdId,
      job.id,
      file.name,
      file.type,
      bytes,
    );

    const document = await prisma.job_documents.create({
      data: {
        id: crypto.randomUUID(),
        household_id: householdId,
        job_id: job.id,
        file_name: file.name,
        mime_type: file.type || null,
        storage_bucket: stored.bucket,
        storage_key: stored.key,
        storage_url: stored.publicUrl,
      },
    });

    return NextResponse.json({
      id: document.id,
      file_name: document.file_name,
      storage_url: document.storage_url,
    });
  } catch (error) {
    console.error("Job document upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
