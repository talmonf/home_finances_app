import test from "node:test";
import assert from "node:assert/strict";
import {
  clinicAccessRequestEmail,
  parseClinicAccessRequest,
} from "@/lib/clinic-access-request";

test("parseClinicAccessRequest accepts a complete request", () => {
  const parsed = parseClinicAccessRequest({
    name: "  Dana Cohen ",
    email: "Dana@Example.com",
    phone: "050-0000000",
    message: "Hello",
    website: "",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.honeypot) return;
  assert.equal(parsed.request.name, "Dana Cohen");
  assert.equal(parsed.request.email, "dana@example.com");
  assert.equal(parsed.request.phone, "050-0000000");
});

test("parseClinicAccessRequest rejects a missing email and swallows honeypot", () => {
  assert.deepEqual(parseClinicAccessRequest({ name: "Dana", email: "not-an-email" }), {
    ok: false,
  });
  const honeypot = parseClinicAccessRequest({
    name: "Bot",
    email: "bot@example.com",
    website: "https://spam.example",
  });
  assert.deepEqual(honeypot, { ok: true, honeypot: true });
});

test("clinicAccessRequestEmail includes the contact details", () => {
  const email = clinicAccessRequestEmail({
    name: "Dana",
    email: "dana@example.com",
    phone: "",
    message: "Need a clinic",
  });
  assert.match(email.subject, /Dana/);
  assert.match(email.text, /dana@example.com/);
  assert.match(email.text, /Need a clinic/);
});
