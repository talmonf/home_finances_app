import { getCurrentHouseholdId, prisma, requireHouseholdMember } from "@/lib/auth";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import { loadReceiptPeriodPreview } from "@/lib/private-clinic/receipt-period-preview";
import { NextRequest, NextResponse } from "next/server";

function parseIsoDate(value: string | null): Date | null {
  const trimmed = value?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(req: NextRequest) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const jobId = req.nextUrl.searchParams.get("jobId")?.trim() ?? "";
  const coveredPeriodStart = parseIsoDate(req.nextUrl.searchParams.get("from"));
  const coveredPeriodEnd = parseIsoDate(req.nextUrl.searchParams.get("to"));

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }
  if (!coveredPeriodStart || !coveredPeriodEnd) {
    return NextResponse.json({ error: "from and to must be valid ISO dates" }, { status: 400 });
  }
  if (coveredPeriodStart > coveredPeriodEnd) {
    return NextResponse.json({ error: "from must be on or before to" }, { status: 400 });
  }

  const job = await prisma.jobs.findFirst({
    where: {
      id: jobId,
      household_id: householdId,
      ...jobWherePrivateClinicScoped(familyMemberId),
    },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found or not accessible" }, { status: 404 });
  }

  const preview = await loadReceiptPeriodPreview({
    householdId,
    jobId,
    coveredPeriodStart,
    coveredPeriodEnd,
  });
  return NextResponse.json(preview);
}
