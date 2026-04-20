import { NextRequest, NextResponse } from "next/server";
import { getCurrentHouseholdId, prisma, requireHouseholdMember } from "@/lib/auth";
import {
  loadTreatmentsCursorPage,
  parseTreatmentsPaidFilter,
  parseTreatmentsReportedFilter,
  parseTreatmentsSortDir,
  parseTreatmentsSortKey,
} from "@/app/dashboard/private-clinic/treatments/treatments-list-data";

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

  const url = req.nextUrl;
  const cursor = url.searchParams.get("cursor")?.trim() || undefined;
  const pageSizeRaw = Number(url.searchParams.get("take") || "50");
  const take = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(Math.trunc(pageSizeRaw), 10), 100) : 50;

  const page = await loadTreatmentsCursorPage({
    householdId,
    familyMemberId,
    take,
    cursorId: cursor,
    filters: {
      paid: parseTreatmentsPaidFilter(url.searchParams.get("paid") ?? undefined),
      reported: parseTreatmentsReportedFilter(url.searchParams.get("reported") ?? undefined),
      job: url.searchParams.get("job")?.trim() || "",
      program: url.searchParams.get("program")?.trim() || "",
      client: url.searchParams.get("client")?.trim() || "",
      family: url.searchParams.get("family")?.trim() || "",
      receipt: url.searchParams.get("receipt")?.trim() || "",
      from: url.searchParams.get("from")?.trim() || "",
      to: url.searchParams.get("to")?.trim() || "",
      sort: parseTreatmentsSortKey(url.searchParams.get("sort") ?? undefined),
      dir: parseTreatmentsSortDir(url.searchParams.get("dir") ?? undefined),
    },
  });

  return NextResponse.json(page);
}
