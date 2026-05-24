import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { fetchUsageMatrix } from "@/lib/usage-audit/bridge";
import { privateClinicFeatureLabel } from "@/lib/usage-audit/catalog";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 90;

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const householdId = url.searchParams.get("householdId") ?? undefined;
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? DEFAULT_DAYS) || DEFAULT_DAYS));
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await fetchUsageMatrix({ householdId, since });

  const featureKeys = rows[0]?.cells.map((c) => c.feature) ?? [];
  const header = [
    "Household",
    "User",
    "Email",
    ...featureKeys.flatMap((f) => [
      `${privateClinicFeatureLabel(f)} (last)`,
      `${privateClinicFeatureLabel(f)} (total)`,
    ]),
  ];

  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    const cells = row.cells.flatMap((c) => [
      c.lastUsedAt ? c.lastUsedAt.toISOString().slice(0, 10) : "",
      String(c.totalCount),
    ]);
    lines.push(
      [row.householdName, row.userName, row.userEmail, ...cells].map(csvEscape).join(","),
    );
  }

  const body = lines.join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="feature-usage-matrix.csv"`,
    },
  });
}
