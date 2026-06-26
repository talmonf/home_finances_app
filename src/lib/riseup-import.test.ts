import test from "node:test";
import assert from "node:assert/strict";
import { parseRiseUpCsvBuffer } from "./riseup-import";

test("parses UTF-8 Hebrew RiseUp CSV exports", async () => {
  const csv = [
    [
      "שייך לתזרים חודש",
      "שם העסק",
      "אמצעי התשלום",
      "אמצעי זיהוי התשלום",
      "תאריך התשלום",
      "חודש תאריך התשלום",
      "שנת תאריך התשלום",
      "תאריך החיוב בחשבון",
      "סכום",
      "מטבע חיוב",
      "מספר התשלום",
      "מספר תשלומים כולל",
      "קטגוריה בתזרים",
      "האם מוחרג מהתזרים?",
      "הערות",
      "סוג מקור",
      "סכום מקורי",
    ].join(","),
    [
      "2026-07",
      "תקוה ומרפא (ער)-גמא",
      "cal",
      "2499",
      "05/07/2026",
      "",
      "",
      "15/07/2026",
      "-72",
      "",
      "10",
      "12",
      "תרומה",
      "false",
      "",
      "creditCard",
      "-864",
    ].join(","),
  ].join("\n");

  const rows = await parseRiseUpCsvBuffer(Buffer.from(`\ufeff${csv}`, "utf8"));

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.businessName, "תקוה ומרפא (ער)-גמא");
  assert.equal(rows[0]?.paymentMethodRaw, "cal");
  assert.equal(rows[0]?.paymentIdentifierRaw, "2499");
  assert.equal(rows[0]?.paymentDate, "2026-07-05");
  assert.equal(rows[0]?.chargeDate, "2026-07-15");
  assert.equal(rows[0]?.amount, -72);
  assert.equal(rows[0]?.originalAmount, -864);
  assert.equal(rows[0]?.cashflowCategory, "תרומה");
  assert.equal(rows[0]?.sourceKind, "creditCard");
});
