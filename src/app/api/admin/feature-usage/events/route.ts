import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { fetchBridgedUsageEvents } from "@/lib/usage-audit/bridge";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 90;
const DEFAULT_LIMIT = 100;

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const householdId = url.searchParams.get("householdId") ?? undefined;
  const userId = url.searchParams.get("userId") ?? undefined;
  const feature = url.searchParams.get("feature") ?? undefined;
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? DEFAULT_DAYS) || DEFAULT_DAYS));
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { events, total } = await fetchBridgedUsageEvents({
    householdId,
    userId,
    feature,
    since,
    limit,
    offset,
  });

  return NextResponse.json({
    since: since.toISOString(),
    events: events.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    limit,
    offset,
  });
}
