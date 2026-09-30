import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { clientIpFromRequest, loginRatelimit } from "@/lib/rate-limit";
import { ingestTreatmentIntake } from "@/lib/therapy/treatment-intake";
import { prismaTreatmentIntakeStore } from "@/lib/therapy/treatment-intake-store";

export async function POST(req: NextRequest) {
  if (loginRatelimit) {
    const ip = clientIpFromRequest(req);
    const { success } = await loginRatelimit.limit(`intake:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many requests. Try again later." },
        { status: 429 },
      );
    }
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const result = await ingestTreatmentIntake({
    authorization: req.headers.get("authorization"),
    payload,
    store: prismaTreatmentIntakeStore,
  });
  if (result.status === 201) {
    revalidatePath("/dashboard/private-clinic/treatments");
  }
  return NextResponse.json(result.body, { status: result.status });
}
