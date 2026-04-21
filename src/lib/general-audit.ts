import { prisma } from "@/lib/auth";

type GeneralAuditInput = {
  householdId?: string | null;
  actorUserId?: string | null;
  actorIsSuperAdmin: boolean;
  actorEmail?: string | null;
  actorName?: string | null;
  feature: string;
  action: string;
  status: "started" | "success" | "failed";
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logGeneralAuditEvent(input: GeneralAuditInput) {
  await prisma.general_audit_events.create({
    data: {
      household_id: input.householdId ?? null,
      actor_user_id: input.actorUserId ?? null,
      actor_is_super_admin: input.actorIsSuperAdmin,
      actor_email: input.actorEmail ?? null,
      actor_name: input.actorName ?? null,
      feature: input.feature,
      action: input.action,
      status: input.status,
      summary: input.summary ?? null,
      metadata: input.metadata ?? {},
    },
  });
}
