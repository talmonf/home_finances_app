import { NextResponse } from "next/server";
import { getCurrentHouseholdId, prisma, requireHouseholdMember } from "@/lib/auth";
import { therapyClientsWhereLinkedPrivateClinicJobs } from "@/lib/private-clinic/jobs-scope";
import { logPrivateClinicAction } from "@/lib/usage-audit/log";
import type { KupatHolimValue } from "@/lib/private-clinic/kupat-holim-filter";

export const dynamic = "force-dynamic";

const KUPAT_VALUES = new Set<KupatHolimValue>(["clalit", "maccabi", "meuhedet", "leumit"]);
const MAX_TEXT_LENGTH = 2000;

type InlineField = "kupat_holim" | "address" | "team_members";

function isCrossSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0]?.trim();
  if (!host) return true;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  if (isCrossSite(req)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let session: Awaited<ReturnType<typeof requireHouseholdMember>>;
  try {
    session = await requireHouseholdMember();
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const clientId = "clientId" in body && typeof body.clientId === "string" ? body.clientId.trim() : "";
  const field = "field" in body && typeof body.field === "string" ? body.field : "";
  const rawValue = "value" in body && typeof body.value === "string" ? body.value : null;
  if (!clientId || rawValue == null) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let data: { kupat_holim: KupatHolimValue | null } | { address: string | null } | { team_members: string | null };
  let stored: string | null;
  if (field === "kupat_holim") {
    const value = rawValue.trim();
    if (value && !KUPAT_VALUES.has(value as KupatHolimValue)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const kupat: KupatHolimValue | null = value ? (value as KupatHolimValue) : null;
    stored = kupat;
    data = { kupat_holim: kupat };
  } else if (field === "address" || field === "team_members") {
    const value = rawValue.trim();
    if (value.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    stored = value || null;
    data = field === "address" ? { address: stored } : { team_members: stored };
  } else {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const updated = await prisma.therapy_clients.updateMany({
    where: {
      id: clientId,
      household_id: householdId,
      ...therapyClientsWhereLinkedPrivateClinicJobs(user?.family_member_id ?? null),
    },
    data,
  });
  if (updated.count !== 1) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await logPrivateClinicAction(session, "clients", "inline-update", {
    resourceType: "client",
    resourceId: clientId,
    metadata: { field: field as InlineField },
  });

  return NextResponse.json({ ok: true, value: stored });
}
