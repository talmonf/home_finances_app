import test from "node:test";
import assert from "node:assert/strict";
import {
  isAuthorizedRenewalCronRequest,
  isVercelCronInvocation,
} from "@/lib/renewal-email/cron-auth";

function cronRequest(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/cron/renewal-emails", {
    headers,
  });
}

test("isVercelCronInvocation detects user-agent and schedule header", () => {
  const prev = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    assert.equal(
      isVercelCronInvocation(
        cronRequest({ "user-agent": "vercel-cron/1.0", "x-vercel-cron-schedule": "0 5 * * *" }),
      ),
      true,
    );
    assert.equal(isVercelCronInvocation(cronRequest({ "user-agent": "curl/8.0" })), false);
  } finally {
    if (prev === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prev;
  }
});

test("isAuthorizedRenewalCronRequest accepts CRON_SECRET bearer token", () => {
  const prev = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-secret";
  try {
    assert.equal(
      isAuthorizedRenewalCronRequest(cronRequest({ authorization: "Bearer test-secret" })),
      true,
    );
    assert.equal(
      isAuthorizedRenewalCronRequest(cronRequest({ authorization: "Bearer wrong" })),
      false,
    );
  } finally {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  }
});

test("shouldSendNow weekly on Monday 7 AM Israel at 05 UTC", async () => {
  const { shouldSendNow } = await import("@/lib/renewal-email/schedule");
  const sub = {
    frequency: "weekly" as const,
    day_of_week: 1,
    day_of_month: null,
    send_hour: 7,
    timezone: "Asia/Jerusalem",
    last_sent_at: null,
    created_at: new Date("2026-01-01T08:00:00Z"),
  };
  assert.equal(shouldSendNow(sub, new Date("2026-05-25T05:00:00.000Z")), true);
});
