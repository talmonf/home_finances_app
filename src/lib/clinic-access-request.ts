export type ClinicAccessRequest = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export type ClinicAccessRequestParse =
  | { ok: true; honeypot: true }
  | { ok: true; honeypot: false; request: ClinicAccessRequest }
  | { ok: false };

const NAME_MAX = 120;
const EMAIL_MAX = 200;
const PHONE_MAX = 40;
const MESSAGE_MAX = 2000;

function asTrimmed(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseClinicAccessRequest(body: unknown): ClinicAccessRequestParse {
  if (!body || typeof body !== "object") return { ok: false };
  const record = body as Record<string, unknown>;
  const website = asTrimmed(record.website, 200);
  if (website) return { ok: true, honeypot: true };

  const name = asTrimmed(record.name, NAME_MAX);
  const email = asTrimmed(record.email, EMAIL_MAX).toLowerCase();
  const phone = asTrimmed(record.phone, PHONE_MAX);
  const message = asTrimmed(record.message, MESSAGE_MAX);
  if (!name || !looksLikeEmail(email)) return { ok: false };

  return {
    ok: true,
    honeypot: false,
    request: { name, email, phone, message },
  };
}

export function clinicAccessRequestEmail(request: ClinicAccessRequest): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Clinic access request: ${request.name}`;
  const lines = [
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    `Phone: ${request.phone || "—"}`,
    "",
    request.message || "—",
  ];
  const text = lines.join("\n");
  const html = lines
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<br />"))
    .join("");
  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
