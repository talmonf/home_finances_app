import test from "node:test";
import assert from "node:assert/strict";
import {
  hostnameFromHostHeader,
  isClinicSplashHost,
  isClinicSplashRequest,
} from "@/lib/clinic-splash-host";
import {
  clinicLoginHref,
  uiLanguageFromAcceptLanguage,
  uiLanguageFromBrowser,
} from "@/lib/clinic-splash-language";

test("hostnameFromHostHeader strips port and lowercases", () => {
  assert.equal(hostnameFromHostHeader("LocalHost:3000"), "localhost");
  assert.equal(hostnameFromHostHeader("soloclinic-il.com"), "soloclinic-il.com");
  assert.equal(hostnameFromHostHeader(""), "");
});

test("isClinicSplashHost allows clinic and local hosts only", () => {
  assert.equal(isClinicSplashHost("soloclinic-il.com"), true);
  assert.equal(isClinicSplashHost("www.soloclinic-il.com"), true);
  assert.equal(isClinicSplashHost("localhost:3000"), true);
  assert.equal(isClinicSplashHost("127.0.0.1:3000"), true);
  assert.equal(isClinicSplashHost("example.com"), false);
});

test("isClinicSplashRequest prefers x-forwarded-host", () => {
  const headers = new Headers({
    "x-forwarded-host": "soloclinic-il.com, internal",
    host: "example.com",
  });
  assert.equal(isClinicSplashRequest({ headers, nextUrlHostname: "example.com" }), true);
});

test("uiLanguageFromBrowser", () => {
  assert.equal(uiLanguageFromBrowser("he-IL"), "he");
  assert.equal(uiLanguageFromBrowser("en-US"), "en");
  assert.equal(uiLanguageFromBrowser("fr"), "he");
  assert.equal(uiLanguageFromBrowser(null), "he");
  assert.equal(uiLanguageFromBrowser(""), "he");
  assert.equal(clinicLoginHref("en"), "/login?lang=en");
  assert.equal(clinicLoginHref("he"), "/login?lang=he");
});

test("uiLanguageFromAcceptLanguage prefers the highest-quality supported tag", () => {
  assert.equal(uiLanguageFromAcceptLanguage("en-US,en;q=0.9,he;q=0.8"), "en");
  assert.equal(uiLanguageFromAcceptLanguage("he-IL,he;q=0.9,en-US;q=0.8"), "he");
  assert.equal(uiLanguageFromAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8"), "en");
  assert.equal(uiLanguageFromAcceptLanguage("en;q=0.1,he;q=0.9"), "he");
  assert.equal(uiLanguageFromAcceptLanguage("fr"), "he");
  assert.equal(uiLanguageFromAcceptLanguage(null), "he");
  assert.equal(uiLanguageFromAcceptLanguage(""), "he");
});
