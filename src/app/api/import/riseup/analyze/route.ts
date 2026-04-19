import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { parseRiseUpCsvBuffer } from "@/lib/riseup-import";
import { matchRiseUpRowsForHousehold } from "@/lib/riseup-matching";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const householdId = token.householdId as string | undefined;
    if (!householdId || token.isSuperAdmin) {
      return NextResponse.json(
        { error: "Household users only. Sign in as a household member." },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 4 MB." }, { status: 400 });
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv")) {
      return NextResponse.json({ error: "RiseUp analyze expects a .csv export." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseRiseUpCsvBuffer(buffer);
    const rows = await matchRiseUpRowsForHousehold(householdId, parsed);

    return NextResponse.json({
      fileName: file.name,
      rowCount: rows.length,
      rows,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analyze failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
