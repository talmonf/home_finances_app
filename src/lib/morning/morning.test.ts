import assert from "node:assert/strict";
import test from "node:test";
import { mapPaymentMethodToMorningType } from "@/lib/morning/client";
import { buildDocumentPayload } from "@/lib/morning/issue-receipt";

test("mapPaymentMethodToMorningType maps clinic payment methods", () => {
  assert.equal(mapPaymentMethodToMorningType("cash"), 1);
  assert.equal(mapPaymentMethodToMorningType("bank_transfer"), 4);
  assert.equal(mapPaymentMethodToMorningType("credit_card"), 3);
  assert.equal(mapPaymentMethodToMorningType("digital_card"), 10);
});

test("buildDocumentPayload uses exempt income rows for type 400", () => {
  const payload = buildDocumentPayload(
    {
      id: "r1",
      issued_at: new Date("2026-05-12T00:00:00.000Z"),
      payment_date: new Date("2026-05-15T00:00:00.000Z"),
      total_amount: { toString: () => "500" },
      net_amount: { toString: () => "500" },
      currency: "ILS",
      payment_method: "bank_transfer",
      notes: "test",
      covered_period_start: new Date("2026-04-01T00:00:00.000Z"),
      covered_period_end: new Date("2026-04-30T00:00:00.000Z"),
    },
    "morning-client-id",
    "Test Client",
    "123456789",
    [{ description: "טיפול 2026-04-01", amount: 500 }],
    400,
    true,
  );

  assert.equal(payload.type, 400);
  assert.equal(payload.client.id, "morning-client-id");
  assert.equal(payload.income[0]?.price, 500);
  assert.equal(payload.income[0]?.vatType, 1);
  assert.equal(payload.payment[0]?.type, 4);
  assert.equal(payload.payment[0]?.price, 500);
});
