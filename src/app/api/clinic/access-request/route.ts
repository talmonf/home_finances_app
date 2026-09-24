import { NextResponse } from "next/server";
import {
  clinicAccessRequestEmail,
  parseClinicAccessRequest,
} from "@/lib/clinic-access-request";
import {
  getEmailProvider,
  isMissingEmailConfigError,
} from "@/lib/email/provider";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = parseClinicAccessRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (parsed.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const to = process.env.CLINIC_ACCESS_REQUEST_TO?.trim();
  if (!to) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const message = clinicAccessRequestEmail(parsed.request);
  try {
    await getEmailProvider().send({
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (error) {
    if (isMissingEmailConfigError(error)) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
