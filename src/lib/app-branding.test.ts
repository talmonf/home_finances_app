import test from "node:test";
import assert from "node:assert/strict";
import {
  appBrandingStrings,
  loginHrefForPortal,
  parseAppPortalCookie,
} from "@/lib/app-branding-strings";

test("parseAppPortalCookie", () => {
  assert.equal(parseAppPortalCookie("clinic"), "clinic");
  assert.equal(parseAppPortalCookie("home"), "home");
  assert.equal(parseAppPortalCookie(undefined), null);
  assert.equal(parseAppPortalCookie("other"), null);
});

test("appBrandingStrings home en", () => {
  const s = appBrandingStrings("home", "en");
  assert.equal(s.title, "Home Finance Management");
  assert.match(s.tagline, /households and finances/);
});

test("appBrandingStrings clinic en", () => {
  const s = appBrandingStrings("clinic", "en");
  assert.equal(s.title, "Clinic management");
  assert.match(s.tagline, /clinic/);
});

test("appBrandingStrings clinic he", () => {
  const s = appBrandingStrings("clinic", "he");
  assert.equal(s.title, "ניהול קליניקה");
});

test("loginHrefForPortal", () => {
  assert.equal(loginHrefForPortal("home"), "/login?portal=home");
  assert.equal(loginHrefForPortal("clinic"), "/login");
});
