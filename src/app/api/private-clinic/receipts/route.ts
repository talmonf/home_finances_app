import { NextRequest, NextResponse } from "next/server";
import { getCurrentHouseholdId, prisma, requireHouseholdMember } from "@/lib/auth";
import {
  loadReceiptsCursorPage,
  parseReceiptsBankFilter,
  parseReceiptsRecipientFilter,
  parseReceiptsSortDir,
  parseReceiptsSortKey,
} from "@/app/dashboard/private-clinic/receipts/receipts-list-data";

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

  const page = await loadReceiptsCursorPage({
    householdId,
    familyMemberId,
    take,
    cursorId: cursor,
    filters: {
      job: url.searchParams.get("job")?.trim() || "",
      client: url.searchParams.get("client")?.trim() || "",
      from: url.searchParams.get("from")?.trim() || "",
      to: url.searchParams.get("to")?.trim() || "",
      recipient: parseReceiptsRecipientFilter(url.searchParams.get("recipient") ?? undefined),
      bank: parseReceiptsBankFilter(url.searchParams.get("bank") ?? undefined),
      sort: parseReceiptsSortKey(url.searchParams.get("sort") ?? undefined),
      dir: parseReceiptsSortDir(url.searchParams.get("dir") ?? undefined),
    },
  });

  return NextResponse.json(page);
}
