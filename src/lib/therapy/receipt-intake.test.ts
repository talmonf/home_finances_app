import assert from "node:assert/strict";
import test from "node:test";
import { parseTherapyOccurredAtFromForm } from "@/lib/therapy/occurred-at-form";
import {
  ingestReceiptIntake,
  splitReceiptAmount,
  type ReceiptIntakeInsert,
  type ReceiptIntakeStore,
} from "@/lib/therapy/receipt-intake";
import {
  hashTreatmentIntakeToken,
  IntakeImportKeyConflict,
  type IntakeClientRow,
} from "@/lib/therapy/treatment-intake";

const TOKEN_A = "token-a";
const TOKEN_B = "token-b";
const HOUSEHOLD = "hh-1";

function client(partial: Partial<IntakeClientRow> & Pick<IntakeClientRow, "id" | "first_name">): IntakeClientRow {
  return {
    last_name: null,
    family_id: null,
    default_job_id: "job-1",
    default_program_id: null,
    default_visit_type: "clinic",
    agreed_fee_amount: null,
    agreed_fee_currency: "ILS",
    ...partial,
  };
}

function memoryStore(options?: {
  clientsByFamilyMember?: Record<string, IntakeClientRow[]>;
  digitalMethods?: { id: string; name: string; familyMemberId: string | null }[];
  takenReceiptNumbers?: string[];
  externalReporting?: string | null;
}): { store: ReceiptIntakeStore; bundles: ReceiptIntakeInsert[] } {
  const bundles: ReceiptIntakeInsert[] = [];
  const clientsByFamilyMember = options?.clientsByFamilyMember ?? {
    "fm-a": [client({ id: "dana-a", first_name: "דנה", last_name: "כהן" })],
    "fm-b": [client({ id: "dana-b", first_name: "דנה", last_name: "לוי" })],
  };
  const accounts: Record<string, { userId: string; familyMemberId: string }> = {
    [hashTreatmentIntakeToken(TOKEN_A)]: { userId: "user-a", familyMemberId: "fm-a" },
    [hashTreatmentIntakeToken(TOKEN_B)]: { userId: "user-b", familyMemberId: "fm-b" },
  };
  const store: ReceiptIntakeStore = {
    async accountForTokenHash(hash) {
      const account = accounts[hash];
      if (!account) return null;
      return { householdId: HOUSEHOLD, userId: account.userId, familyMemberId: account.familyMemberId };
    },
    async activeClients(_householdId, familyMemberId) {
      return clientsByFamilyMember[familyMemberId] ?? [];
    },
    async job() {
      return { id: "job-1", external_reporting_system: options?.externalReporting ?? "Ministry" };
    },
    async programCount() {
      return 0;
    },
    async programBelongsToJob() {
      return true;
    },
    async findDigitalPaymentMethod(_householdId, familyMemberId, name) {
      const wanted = name.toLocaleLowerCase("en-US");
      const matches = (options?.digitalMethods ?? []).filter(
        (row) => row.name.trim().toLocaleLowerCase("en-US") === wanted,
      );
      return (matches.find((row) => row.familyMemberId === familyMemberId) ?? matches[0])?.id ?? null;
    },
    async receiptNumberAvailable(_householdId, receiptNumber) {
      return !(options?.takenReceiptNumbers ?? []).includes(receiptNumber);
    },
    async findByImportKey(_householdId, importKey) {
      const bundle = bundles.find((item) => item.receipt.import_key === importKey);
      if (!bundle) return null;
      return { id: bundle.receipt.id, treatment_ids: bundle.treatments.map((row) => row.id) };
    },
    async insertBundle(data) {
      if (bundles.some((item) => item.receipt.import_key === data.receipt.import_key)) {
        throw new IntakeImportKeyConflict();
      }
      bundles.push(data);
      return { id: data.receipt.id, treatment_ids: data.treatments.map((row) => row.id) };
    },
  };
  return { store, bundles };
}

const basePayload = {
  external_id: "response-1",
  receipt_number: "1042",
  payment_date: "2026-09-30",
  client_name: "דנה",
  amount: "100",
  notes: "שולם",
  payment_method: "Cash",
  treatment_date: "2026-09-02",
  treatment_time: "16:30",
  treatment_date_2: "",
  treatment_date_3: "",
  treatment_date_4: "",
};

test("splits a total equally and gives the leftover agorot to the last part", () => {
  assert.deepEqual(splitReceiptAmount("100.00", 3), ["33.33", "33.33", "33.34"]);
  assert.deepEqual(splitReceiptAmount("400", 2), ["200.00", "200.00"]);
});

test("creates one treatment when only the first date is filled", async () => {
  const { store, bundles } = memoryStore();
  let n = 0;
  const result = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_A}`,
    payload: basePayload,
    store,
    newId: () => `id-${++n}`,
  });
  assert.equal(result.status, 201);
  if (result.status !== 201) return;
  assert.deepEqual(result.body.treatment_ids, ["id-2"]);
  const bundle = bundles[0];
  assert.equal(bundle?.treatments.length, 1);
  assert.equal(bundle?.treatments[0]?.amount, "100.00");
  assert.equal(bundle?.allocations[0]?.amount, "100.00");
  assert.equal(bundle?.receipt.notes, "שולם");
  assert.equal(bundle?.receipt.payment_method, "cash");
  assert.equal(bundle?.treatments[0]?.payment_method, "cash");
  assert.equal(bundle?.treatments[0]?.reported_to_external_system, true);
  assert.equal(
    bundle?.treatments[0]?.occurred_at.toISOString(),
    parseTherapyOccurredAtFromForm("2026-09-02", "16:30")?.toISOString(),
  );
});

test("creates four treatments when every date is filled", async () => {
  const { store, bundles } = memoryStore();
  const result = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_A}`,
    payload: {
      ...basePayload,
      external_id: "all-four",
      amount: "400",
      treatment_date: "2026-09-02",
      treatment_date_2: "2026-09-09",
      treatment_date_3: "2026-09-16",
      treatment_date_4: "2026-09-23",
    },
    store,
  });
  assert.equal(result.status, 201);
  assert.equal(bundles[0]?.treatments.length, 4);
  assert.deepEqual(
    bundles[0]?.treatments.map((row) => row.amount),
    ["100.00", "100.00", "100.00", "100.00"],
  );
  assert.equal(result.status === 201 ? result.body.treatment_ids.length : 0, 4);
});

test("creates one treatment per filled date and ignores empty slots", async () => {
  const { store, bundles } = memoryStore({ digitalMethods: [{ id: "bit-a", name: "Bit", familyMemberId: "fm-a" }] });
  const result = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_A}`,
    payload: {
      ...basePayload,
      external_id: "four",
      amount: "100",
      payment_method: "Bit",
      treatment_date: "2026-09-02",
      treatment_date_2: "",
      treatment_date_3: "2026-09-16",
      treatment_date_4: "2026-09-23",
    },
    store,
    newId: (() => {
      let n = 0;
      return () => `row-${++n}`;
    })(),
  });
  assert.equal(result.status, 201);
  const bundle = bundles[0];
  assert.equal(bundle?.treatments.length, 3);
  assert.deepEqual(
    bundle?.treatments.map((row) => row.amount),
    ["33.33", "33.33", "33.34"],
  );
  assert.equal(bundle?.receipt.payment_method, "digital_card");
  assert.equal(bundle?.treatments[0]?.payment_method, "digital_payment");
  assert.equal(bundle?.treatments[0]?.payment_digital_payment_method_id, "bit-a");
  assert.equal(bundle?.treatments[2]?.payment_digital_payment_method_id, "bit-a");
  const expectedTime = parseTherapyOccurredAtFromForm("2026-09-23", "16:30")?.toISOString();
  assert.equal(bundle?.treatments[2]?.occurred_at.toISOString(), expectedTime);
  assert.equal(
    bundle?.allocations.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2),
    "100.00",
  );
});

test("Paybox uses the method linked to this user when two exist", async () => {
  const { store, bundles } = memoryStore({
    digitalMethods: [
      { id: "paybox-other", name: "Paybox", familyMemberId: "fm-b" },
      { id: "paybox-a", name: "Paybox", familyMemberId: "fm-a" },
    ],
  });
  const result = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_A}`,
    payload: { ...basePayload, external_id: "paybox", payment_method: "Paybox" },
    store,
  });
  assert.equal(result.status, 201);
  assert.equal(bundles[0]?.treatments[0]?.payment_digital_payment_method_id, "paybox-a");
});

test("a missing Bit or Paybox method creates nothing", async () => {
  const { store, bundles } = memoryStore();
  const result = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_A}`,
    payload: { ...basePayload, external_id: "no-bit", payment_method: "Bit" },
    store,
  });
  assert.equal(result.status, 422);
  if (result.status === 422) assert.equal(result.body.error, "digital_method_not_found");
  assert.equal(bundles.length, 0);
});

test("bank transfer leaves the bank account empty", async () => {
  const { store, bundles } = memoryStore();
  const result = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_A}`,
    payload: { ...basePayload, external_id: "bank", payment_method: "Bank transfer" },
    store,
  });
  assert.equal(result.status, 201);
  assert.equal(bundles[0]?.receipt.payment_method, "bank_transfer");
  assert.equal(bundles[0]?.treatments[0]?.payment_method, "bank_transfer");
  assert.equal(bundles[0]?.treatments[0]?.payment_digital_payment_method_id, null);
});

test("a repeated external_id returns the existing receipt and treatments", async () => {
  const { store, bundles } = memoryStore();
  const first = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_A}`,
    payload: basePayload,
    store,
    newId: (() => {
      let n = 0;
      return () => `keep-${++n}`;
    })(),
  });
  assert.equal(first.status, 201);
  const second = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_A}`,
    payload: { ...basePayload, client_name: "someone else", amount: "1" },
    store,
  });
  assert.equal(second.status, 200);
  if (first.status === 201 && second.status === 200) {
    assert.deepEqual(second.body, first.body);
  }
  assert.equal(bundles.length, 1);
});

test("a token only matches that user's clients", async () => {
  const { store, bundles } = memoryStore();
  const result = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_B}`,
    payload: { ...basePayload, external_id: "other-clinic", client_name: "דנה כ" },
    store,
  });
  assert.equal(result.status, 404);
  assert.equal(bundles.length, 0);
  const own = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_B}`,
    payload: { ...basePayload, external_id: "own-clinic", client_name: "דנה ל" },
    store,
  });
  assert.equal(own.status, 201);
  assert.equal(bundles[0]?.receipt.client_id, "dana-b");
});

test("a receipt number already used this year is rejected", async () => {
  const { store, bundles } = memoryStore({ takenReceiptNumbers: ["1042"] });
  const result = await ingestReceiptIntake({
    authorization: `Bearer ${TOKEN_A}`,
    payload: basePayload,
    store,
  });
  assert.equal(result.status, 409);
  if (result.status === 409) assert.equal(result.body.error, "duplicate_receipt_number");
  assert.equal(bundles.length, 0);
});
