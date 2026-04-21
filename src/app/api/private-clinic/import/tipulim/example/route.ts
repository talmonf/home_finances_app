import { getAuthSession } from "@/lib/auth";
import { tipulimImportExampleCsv, type TipulimImportProfile } from "@/lib/therapy/import-tipulim";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseProfile(raw: string | null): TipulimImportProfile | null {
  const t = (raw ?? "").trim();
  if (t === "tipulim_org_monthly") return "tipulim_org_monthly";
  if (t === "tipulim_receipts_only") return "tipulim_receipts_only";
  if (t === "tipulim_private" || t === "") return "tipulim_private";
  return null;
}

export async function GET(req: Request) {
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (!session?.user || !householdId || session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const profile = parseProfile(searchParams.get("profile"));
  if (!profile) {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }
  const body = tipulimImportExampleCsv(profile);
  const name =
    profile === "tipulim_org_monthly"
      ? "tipulim-organization-monthly-example.csv"
      : profile === "tipulim_receipts_only"
        ? "receipts-import-example.csv"
        : "tipulim-private-clinic-example.csv";
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
