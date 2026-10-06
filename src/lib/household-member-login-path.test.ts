import assert from "node:assert/strict";
import test from "node:test";
import {
  googleCalendarReconnectHref,
  householdMemberLoginPath,
  safePostLoginPath,
} from "@/lib/household-member-login-path";

test("calendar reconnect link sends household login back to the reconnect section", () => {
  const path = householdMemberLoginPath("/dashboard/upcoming-renewals/email-settings");
  const url = new URL(path, "https://example.test");
  assert.equal(url.pathname, "/login");
  assert.equal(url.searchParams.get("portal"), "home");
  assert.equal(
    url.searchParams.get("callbackUrl"),
    "/dashboard/upcoming-renewals/email-settings#google-calendar",
  );
  assert.equal(url.searchParams.get("notice"), "household-calendar");
  assert.equal(
    googleCalendarReconnectHref(),
    "/dashboard/upcoming-renewals/email-settings#google-calendar",
  );
});

test("post-login path keeps an in-app hash and drops off-site targets", () => {
  assert.equal(
    safePostLoginPath("/dashboard/upcoming-renewals/email-settings#google-calendar"),
    "/dashboard/upcoming-renewals/email-settings#google-calendar",
  );
  assert.equal(safePostLoginPath("https://evil.test/dashboard"), "/");
  assert.equal(safePostLoginPath(undefined), "/");
});

test("clinic pages keep the clinic login portal", () => {
  const path = householdMemberLoginPath("/dashboard/private-clinic/settings");
  const url = new URL(path, "https://example.test");
  assert.equal(url.searchParams.get("portal"), null);
  assert.equal(url.searchParams.get("callbackUrl"), "/dashboard/private-clinic/settings");
  assert.equal(url.searchParams.get("notice"), null);
});

test("unsafe paths fall back to home", () => {
  const path = householdMemberLoginPath("https://evil.test");
  const url = new URL(path, "https://example.test");
  assert.equal(url.searchParams.get("callbackUrl"), "/");
});
