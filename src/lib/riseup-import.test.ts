import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRiseUpImportIdentity,
  parseRiseUpCsvBuffer,
  parseRiseUpRawRecord,
} from "./riseup-import";

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

test("keeps native RiseUp identity stable when mutable content changes", async () => {
  const base = {
    rowIndex: 0,
    businessName: "תקוה ומרפא (ער)-גמא",
    paymentMethodRaw: "cal",
    paymentIdentifierRaw: "2499",
    sourceKind: "creditCard",
    paymentDate: "2026-07-05",
    chargeDate: "2026-07-15",
    amount: -72,
    originalAmount: -864,
    cashflowCategory: "תרומה",
    isZeroAmountPending: false,
    raw: {
      "שייך לתזרים חודש": "2026-07",
      "שם העסק": "תקוה ומרפא (ער)-גמא",
      "אמצעי התשלום": "cal",
      "אמצעי זיהוי התשלום": "2499",
      "תאריך התשלום": "05/07/2026",
      "תאריך החיוב בחשבון": "15/07/2026",
      "סכום": "-72",
      "מספר התשלום": "10",
      "מספר תשלומים כולל": "12",
      "קטגוריה בתזרים": "תרומה",
      "סוג מקור": "creditCard",
      "סכום מקורי": "-864",
    },
  };

  const changed = {
    ...base,
    amount: -75,
    cashflowCategory: "תרומות",
    raw: {
      ...base.raw,
      "סכום": "-75",
      "קטגוריה בתזרים": "תרומות",
    },
  };

  const first = buildRiseUpImportIdentity(base);
  const second = buildRiseUpImportIdentity(changed);

  assert.equal(first.basis, "native");
  assert.equal(second.basis, "native");
  assert.equal(first.importKey, second.importKey);
  assert.notEqual(first.contentHash, second.contentHash);
});

test("uses a broader fallback identity when RiseUp native keys are absent", () => {
  const row = {
    rowIndex: 0,
    businessName: "Merchant",
    paymentMethodRaw: "Bank",
    paymentIdentifierRaw: "1234",
    sourceKind: "checkingAccount",
    paymentDate: "2026-07-05",
    chargeDate: null,
    amount: -50,
    originalAmount: null,
    cashflowCategory: "Food",
    isZeroAmountPending: false,
    raw: {
      "שם העסק": "Merchant",
      "אמצעי התשלום": "Bank",
      "אמצעי זיהוי התשלום": "1234",
      "תאריך התשלום": "05/07/2026",
      "סכום": "-50",
      "קטגוריה בתזרים": "Food",
      "סוג מקור": "checkingAccount",
    },
  };

  const first = buildRiseUpImportIdentity(row);
  const second = buildRiseUpImportIdentity({ ...row, amount: -55 });

  assert.equal(first.basis, "fallback");
  assert.notEqual(first.importKey, second.importKey);
});

test("reconstructs a legacy RiseUp row from stored raw source record JSON", () => {
  const raw = {
    "שייך לתזרים חודש": "2026-07",
    "שם העסק": "חשמל לדוגמה",
    "אמצעי התשלום": "bank",
    "אמצעי זיהוי התשלום": "123456",
    "תאריך התשלום": "07/07/2026",
    "תאריך החיוב בחשבון": "08/07/2026",
    "סכום": "-210.50",
    "קטגוריה בתזרים": "חשמל",
    "סוג מקור": "checkingAccount",
  };

  const row = parseRiseUpRawRecord(raw, 12);
  const identity = buildRiseUpImportIdentity(row);

  assert.equal(row.rowIndex, 12);
  assert.equal(row.businessName, "חשמל לדוגמה");
  assert.equal(row.paymentDate, "2026-07-07");
  assert.equal(row.chargeDate, "2026-07-08");
  assert.equal(row.amount, -210.5);
  assert.equal(row.cashflowCategory, "חשמל");
  assert.equal(identity.basis, "fallback");
});
