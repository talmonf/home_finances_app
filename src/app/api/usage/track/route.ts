import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  pathnameToPrivateClinicFeature,
  USAGE_DOMAIN_PRIVATE_CLINIC,
  USAGE_EVENT_VISIT,
} from "@/lib/usage-audit/catalog";
import { logUsageEvent } from "@/lib/usage-audit/log";

export const dynamic = "force-dynamic";

type TrackBody = {
  domain?: string;
  feature?: string;
  event_type?: string;
  pathname?: string;
};

export async function POST(request: Request) {
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  const userId = session?.user?.id;

  if (!session?.user || !householdId || !userId || session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TrackBody;
  try {
    body = (await request.json()) as TrackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.domain !== USAGE_DOMAIN_PRIVATE_CLINIC) {
    return NextResponse.json({ error: "Unsupported domain" }, { status: 400 });
  }

  let feature = body.feature;
  if (body.pathname) {
    const fromPath = pathnameToPrivateClinicFeature(body.pathname);
    if (fromPath) feature = fromPath;
  }

  if (!feature || body.event_type !== USAGE_EVENT_VISIT) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await logUsageEvent({
    householdId,
    userId,
    domain: USAGE_DOMAIN_PRIVATE_CLINIC,
    feature: feature as Parameters<typeof logUsageEvent>[0]["feature"],
    eventType: USAGE_EVENT_VISIT,
  });

  return NextResponse.json({ ok: true });
}
