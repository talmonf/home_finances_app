import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { fetchUsageMatrix } from "@/lib/usage-audit/bridge";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 90;

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const householdId = url.searchParams.get("householdId") ?? undefined;
  const userId = url.searchParams.get("userId") ?? undefined;
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? DEFAULT_DAYS) || DEFAULT_DAYS));
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await fetchUsageMatrix({ householdId, userId, since });
  return NextResponse.json({ since: since.toISOString(), rows });
}
