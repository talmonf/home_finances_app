import test from "node:test";
import assert from "node:assert/strict";
import { loginPageStrings } from "@/lib/login-i18n";
import { preferHebrewFromAcceptLanguage } from "@/lib/login-ui-language-helpers";

test("loginPageStrings clinic he", () => {
  const s = loginPageStrings("clinic", "he");
  assert.equal(s.title, "ניהול קליניקה");
  assert.equal(s.signIn, "התחבר");
});

test("preferHebrewFromAcceptLanguage", () => {
  assert.equal(preferHebrewFromAcceptLanguage("he-IL,he;q=0.9,en;q=0.8"), true);
  assert.equal(preferHebrewFromAcceptLanguage("en-US,en;q=0.9"), false);
  assert.equal(preferHebrewFromAcceptLanguage(null), false);
});
