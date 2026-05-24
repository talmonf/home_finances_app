import type { Session } from "next-auth";
import { prisma } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import type { PrivateClinicNavKey } from "@/lib/private-clinic-nav";
import {
  USAGE_DOMAIN_PRIVATE_CLINIC,
  USAGE_EVENT_ACTION,
  USAGE_EVENT_VISIT,
  type UsageDomain,
  type UsageEventType,
} from "@/lib/usage-audit/catalog";

/** Server-side guard against rapid duplicate visits (client debounces too). */
const VISIT_DEBOUNCE_MS = 2 * 60 * 1000;

export type LogUsageEventInput = {
  householdId: string;
  userId: string;
  domain: UsageDomain;
  feature: PrivateClinicNavKey;
  eventType: UsageEventType;
  action?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  /** When true, skip visit debounce (e.g. explicit actions). */
  skipVisitDebounce?: boolean;
};

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Prisma.InputJsonValue {
  if (!metadata || typeof metadata !== "object") return {};
  const out: Record<string, unknown> = {};
  const allowed = new Set([
    "document_id",
    "appointment_id",
    "import_run_id",
    "client_id",
    "receipt_id",
    "treatment_id",
    "from",
  ]);
  for (const [k, v] of Object.entries(metadata)) {
    if (!allowed.has(k)) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return out as Prisma.InputJsonValue;
}

async function shouldSkipDebouncedVisit(input: LogUsageEventInput): Promise<boolean> {
  if (input.eventType !== USAGE_EVENT_VISIT || input.skipVisitDebounce) return false;
  const since = new Date(Date.now() - VISIT_DEBOUNCE_MS);
  const recent = await prisma.user_feature_usage_events.findFirst({
    where: {
      user_id: input.userId,
      domain: input.domain,
      feature: input.feature,
      event_type: USAGE_EVENT_VISIT,
      created_at: { gte: since },
    },
    select: { id: true },
  });
  return recent != null;
}

async function upsertRollup(input: LogUsageEventInput, at: Date): Promise<void> {
  const existing = await prisma.user_feature_usage_rollups.findUnique({
    where: {
      household_id_user_id_domain_feature_event_type: {
        household_id: input.householdId,
        user_id: input.userId,
        domain: input.domain,
        feature: input.feature,
        event_type: input.eventType,
      },
    },
  });

  if (existing) {
    await prisma.user_feature_usage_rollups.update({
      where: { id: existing.id },
      data: {
        last_used_at: at,
        event_count: { increment: 1 },
      },
    });
    return;
  }

  await prisma.user_feature_usage_rollups.create({
    data: {
      household_id: input.householdId,
      user_id: input.userId,
      domain: input.domain,
      feature: input.feature,
      event_type: input.eventType,
      first_used_at: at,
      last_used_at: at,
      event_count: 1,
    },
  });
}

export async function logUsageEvent(input: LogUsageEventInput): Promise<void> {
  try {
    if (await shouldSkipDebouncedVisit(input)) return;

    const at = new Date();
    await prisma.user_feature_usage_events.create({
      data: {
        household_id: input.householdId,
        user_id: input.userId,
        domain: input.domain,
        feature: input.feature,
        event_type: input.eventType,
        action: input.action ?? null,
        resource_type: input.resourceType ?? null,
        resource_id: input.resourceId ?? null,
        metadata: sanitizeMetadata(input.metadata),
      },
    });
    await upsertRollup(input, at);
  } catch (err) {
    console.error("[usage-audit] logUsageEvent failed", err);
  }
}

export async function logUsageEventFromSession(
  session: Session,
  input: Omit<LogUsageEventInput, "householdId" | "userId">,
): Promise<void> {
  const householdId = session.user?.householdId;
  const userId = session.user?.id;
  if (!householdId || !userId || session.user?.isSuperAdmin) return;

  await logUsageEvent({
    ...input,
    householdId,
    userId,
  });
}

export async function logPrivateClinicAction(
  session: Session,
  feature: PrivateClinicNavKey,
  action: string,
  opts?: {
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await logUsageEventFromSession(session, {
    domain: USAGE_DOMAIN_PRIVATE_CLINIC,
    feature,
    eventType: USAGE_EVENT_ACTION,
    action,
    resourceType: opts?.resourceType,
    resourceId: opts?.resourceId,
    metadata: opts?.metadata,
    skipVisitDebounce: true,
  });
}
