import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  pathnameToPrivateClinicFeature,
  USAGE_DOMAIN_PRIVATE_CLINIC,
  USAGE_EVENT_ACTION,
  USAGE_EVENT_VISIT,
} from "@/lib/usage-audit/catalog";
import type { PrivateClinicNavKey } from "@/lib/private-clinic-nav";

const ALLOWED_CLIENT_ACTIONS: Partial<Record<PrivateClinicNavKey, readonly string[]>> = {
  upcomingVisits: ["open_log_treatment"],
  treatments: ["open_new_modal"],
};
import { logUsageEvent } from "@/lib/usage-audit/log";

export const dynamic = "force-dynamic";

type TrackBody = {
  domain?: string;
  feature?: string;
  event_type?: string;
  action?: string;
  pathname?: string;
  metadata?: Record<string, string>;
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

  if (!feature) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const clinicFeature = feature as Parameters<typeof logUsageEvent>[0]["feature"];

  if (body.event_type === USAGE_EVENT_VISIT) {
    await logUsageEvent({
      householdId,
      userId,
      domain: USAGE_DOMAIN_PRIVATE_CLINIC,
      feature: clinicFeature,
      eventType: USAGE_EVENT_VISIT,
      metadata: body.metadata,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.event_type === USAGE_EVENT_ACTION) {
    const action = body.action?.trim();
    const allowed = ALLOWED_CLIENT_ACTIONS[clinicFeature];
    if (!action || !allowed?.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    await logUsageEvent({
      householdId,
      userId,
      domain: USAGE_DOMAIN_PRIVATE_CLINIC,
      feature: clinicFeature,
      eventType: USAGE_EVENT_ACTION,
      action,
      metadata: body.metadata,
      skipVisitDebounce: true,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
