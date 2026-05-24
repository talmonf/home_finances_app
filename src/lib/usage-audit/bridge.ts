import { prisma } from "@/lib/auth";
import type { PrivateClinicNavKey } from "@/lib/private-clinic-nav";
import {
  generalAuditFeatureToPrivateClinicNav,
  PRIVATE_CLINIC_FEATURE_KEYS,
  USAGE_DOMAIN_PRIVATE_CLINIC,
  USAGE_EVENT_ACTION,
} from "@/lib/usage-audit/catalog";

export type BridgedUsageSource = "usage_event" | "appointment_audit" | "general_audit";

export type BridgedUsageRow = {
  source: BridgedUsageSource;
  id: string;
  householdId: string;
  userId: string;
  domain: string;
  feature: string;
  eventType: string;
  action: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export type MatrixCell = {
  feature: PrivateClinicNavKey;
  lastUsedAt: Date | null;
  visitCount: number;
  actionCount: number;
  totalCount: number;
};

export type MatrixUserRow = {
  userId: string;
  userName: string;
  userEmail: string;
  householdId: string;
  householdName: string;
  cells: MatrixCell[];
};

type MatrixQuery = {
  householdId?: string;
  userId?: string;
  since: Date;
};

export async function fetchUsageMatrix(query: MatrixQuery): Promise<MatrixUserRow[]> {
  const { householdId, userId, since } = query;

  const userWhere = {
    is_active: true,
    ...(householdId ? { household_id: householdId } : {}),
    ...(userId ? { id: userId } : {}),
    household: {
      household_enabled_sections: {
        some: { section_id: "privateClinic", enabled: true },
      },
    },
  };

  const users = await prisma.users.findMany({
    where: userWhere,
    select: {
      id: true,
      full_name: true,
      email: true,
      household_id: true,
      household: { select: { name: true } },
    },
    orderBy: [{ household: { name: "asc" } }, { full_name: "asc" }],
  });

  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);
  const householdIds = [...new Set(users.map((u) => u.household_id))];

  const [rollups, appointmentAgg, generalAgg] = await Promise.all([
    prisma.user_feature_usage_rollups.findMany({
      where: {
        user_id: { in: userIds },
        domain: USAGE_DOMAIN_PRIVATE_CLINIC,
        last_used_at: { gte: since },
        ...(householdId ? { household_id: householdId } : {}),
      },
    }),
    prisma.therapy_appointment_audits.groupBy({
      by: ["user_id"],
      where: {
        household_id: { in: householdIds },
        user_id: { in: userIds },
        created_at: { gte: since },
      },
      _count: { id: true },
      _max: { created_at: true },
    }),
    prisma.general_audit_events.findMany({
      where: {
        household_id: { in: householdIds },
        actor_user_id: { in: userIds },
        actor_is_super_admin: false,
        status: "success",
        created_at: { gte: since },
        feature: { startsWith: "private_clinic_" },
      },
      select: {
        actor_user_id: true,
        feature: true,
        action: true,
        created_at: true,
      },
    }),
  ]);

  const appointmentByUser = new Map(
    appointmentAgg.map((a) => [
      a.user_id,
      { count: a._count.id, lastAt: a._max.created_at },
    ]),
  );

  const generalByUserFeature = new Map<string, { count: number; lastAt: Date }>();
  for (const e of generalAgg) {
    if (!e.actor_user_id) continue;
    const nav = generalAuditFeatureToPrivateClinicNav(e.feature);
    if (!nav) continue;
    const key = `${e.actor_user_id}:${nav}`;
    const cur = generalByUserFeature.get(key);
    if (!cur) {
      generalByUserFeature.set(key, { count: 1, lastAt: e.created_at });
    } else {
      cur.count += 1;
      if (e.created_at > cur.lastAt) cur.lastAt = e.created_at;
    }
  }

  const rollupByUserFeature = new Map<string, { visitCount: number; actionCount: number; lastAt: Date | null }>();
  for (const r of rollups) {
    const key = `${r.user_id}:${r.feature}`;
    const cur = rollupByUserFeature.get(key) ?? {
      visitCount: 0,
      actionCount: 0,
      lastAt: null as Date | null,
    };
    if (r.event_type === "visit") cur.visitCount += r.event_count;
    else cur.actionCount += r.event_count;
    if (!cur.lastAt || r.last_used_at > cur.lastAt) cur.lastAt = r.last_used_at;
    rollupByUserFeature.set(key, cur);
  }

  return users.map((u) => {
    const apt = appointmentByUser.get(u.id);
    const cells: MatrixCell[] = PRIVATE_CLINIC_FEATURE_KEYS.map((feature) => {
      const rollup = rollupByUserFeature.get(`${u.id}:${feature}`);
      const general = generalByUserFeature.get(`${u.id}:${feature}`);

      let visitCount = rollup?.visitCount ?? 0;
      let actionCount = rollup?.actionCount ?? 0;
      let lastUsedAt = rollup?.lastAt ?? null;

      if (feature === "appointments" && apt) {
        actionCount += apt.count;
        if (!lastUsedAt || (apt.lastAt && apt.lastAt > lastUsedAt)) {
          lastUsedAt = apt.lastAt;
        }
      }
      if (general) {
        actionCount += general.count;
        if (!lastUsedAt || general.lastAt > lastUsedAt) {
          lastUsedAt = general.lastAt;
        }
      }

      return {
        feature,
        lastUsedAt,
        visitCount,
        actionCount,
        totalCount: visitCount + actionCount,
      };
    });

    return {
      userId: u.id,
      userName: u.full_name,
      userEmail: u.email,
      householdId: u.household_id,
      householdName: u.household.name,
      cells,
    };
  });
}

export async function fetchBridgedUsageEvents(query: {
  householdId?: string;
  userId?: string;
  feature?: string;
  since: Date;
  limit: number;
  offset: number;
}): Promise<{ events: BridgedUsageRow[]; total: number }> {
  const { householdId, userId, feature, since, limit, offset } = query;
  const poolSize = Math.min(500, limit + offset + 100);

  const usageWhere = {
    domain: USAGE_DOMAIN_PRIVATE_CLINIC,
    created_at: { gte: since },
    ...(householdId ? { household_id: householdId } : {}),
    ...(userId ? { user_id: userId } : {}),
    ...(feature ? { feature } : {}),
  };

  const includeAppointmentAudits = !feature || feature === "appointments";
  const includeGeneralAudits =
    !feature || feature === "importExport" || feature === "reports";

  const [usageEvents, usageTotal, aptAudits, generalAudits] = await Promise.all([
    prisma.user_feature_usage_events.findMany({
      where: usageWhere,
      orderBy: { created_at: "desc" },
      take: poolSize,
    }),
    prisma.user_feature_usage_events.count({ where: usageWhere }),
    includeAppointmentAudits
      ? prisma.therapy_appointment_audits.findMany({
          where: {
            created_at: { gte: since },
            ...(householdId ? { household_id: householdId } : {}),
            ...(userId ? { user_id: userId } : {}),
          },
          orderBy: { created_at: "desc" },
          take: poolSize,
          select: {
            id: true,
            household_id: true,
            user_id: true,
            appointment_id: true,
            action: true,
            created_at: true,
          },
        })
      : Promise.resolve([]),
    includeGeneralAudits
      ? prisma.general_audit_events.findMany({
          where: {
            created_at: { gte: since },
            actor_is_super_admin: false,
            status: "success",
            feature: { startsWith: "private_clinic_" },
            ...(householdId ? { household_id: householdId } : {}),
            ...(userId ? { actor_user_id: userId } : {}),
          },
          orderBy: { created_at: "desc" },
          take: poolSize,
          select: {
            id: true,
            household_id: true,
            actor_user_id: true,
            feature: true,
            action: true,
            created_at: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const bridged: BridgedUsageRow[] = usageEvents.map((e) => ({
    source: "usage_event" as const,
    id: e.id,
    householdId: e.household_id,
    userId: e.user_id,
    domain: e.domain,
    feature: e.feature,
    eventType: e.event_type,
    action: e.action,
    resourceType: e.resource_type,
    resourceId: e.resource_id,
    metadata:
      e.metadata && typeof e.metadata === "object" && !Array.isArray(e.metadata)
        ? (e.metadata as Record<string, unknown>)
        : undefined,
    createdAt: e.created_at,
  }));

  for (const a of aptAudits) {
    bridged.push({
      source: "appointment_audit",
      id: a.id,
      householdId: a.household_id,
      userId: a.user_id,
      domain: USAGE_DOMAIN_PRIVATE_CLINIC,
      feature: "appointments",
      eventType: USAGE_EVENT_ACTION,
      action: a.action,
      resourceType: "appointment",
      resourceId: a.appointment_id,
      createdAt: a.created_at,
    });
  }

  for (const g of generalAudits) {
    if (!g.household_id || !g.actor_user_id) continue;
    const nav = generalAuditFeatureToPrivateClinicNav(g.feature);
    if (!nav) continue;
    if (feature && nav !== feature) continue;
    bridged.push({
      source: "general_audit",
      id: g.id,
      householdId: g.household_id,
      userId: g.actor_user_id,
      domain: USAGE_DOMAIN_PRIVATE_CLINIC,
      feature: nav,
      eventType: USAGE_EVENT_ACTION,
      action: g.action,
      resourceType: null,
      resourceId: null,
      createdAt: g.created_at,
    });
  }

  bridged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    events: bridged.slice(offset, offset + limit),
    total: usageTotal + aptAudits.length + generalAudits.length,
  };
}

export function usageAuditSourceLabel(source: BridgedUsageRow["source"]): string {
  switch (source) {
    case "usage_event":
      return "Usage";
    case "appointment_audit":
      return "Appointment audit";
    case "general_audit":
      return "General audit";
    default:
      return source;
  }
}
