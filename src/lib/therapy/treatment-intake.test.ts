import assert from "node:assert/strict";
import test from "node:test";
import {
  IntakeImportKeyConflict,
  hashTreatmentIntakeToken,
  ingestTreatmentIntake,
  type IntakeClientRow,
  type IntakeStore,
  type IntakeTreatmentInsert,
} from "@/lib/therapy/treatment-intake";

const TOKEN = "test-intake-token";
const HOUSEHOLD = "hh-1";
const USER_ID = "user-1";
const FAMILY_MEMBER_ID = "fm-1";

function client(partial: Partial<IntakeClientRow> & Pick<IntakeClientRow, "id" | "first_name">): IntakeClientRow {
  return {
    last_name: null,
    family_id: null,
    default_job_id: "job-1",
    default_program_id: null,
    default_visit_type: "clinic",
    agreed_fee_amount: "350",
    agreed_fee_currency: "ILS",
    ...partial,
  };
}

function memoryStore(options?: {
  clients?: IntakeClientRow[];
  clientsByFamilyMember?: Record<string, IntakeClientRow[]>;
  programCount?: number;
  externalReporting?: string | null;
  familyMemberId?: string | null;
  accounts?: Record<string, { userId: string; familyMemberId: string | null }>;
}): { store: IntakeStore; rows: IntakeTreatmentInsert[] } {
  const rows: IntakeTreatmentInsert[] = [];
  const clients = options?.clients ?? [client({ id: "dana", first_name: "דנה", last_name: "כהן" })];
  const familyMemberId = options?.familyMemberId === undefined ? FAMILY_MEMBER_ID : options.familyMemberId;
  const accounts = options?.accounts ?? {
    [hashTreatmentIntakeToken(TOKEN)]: { userId: USER_ID, familyMemberId },
  };
  const store: IntakeStore = {
    async accountForTokenHash(hash) {
      const account = accounts[hash];
      if (!account) return null;
      return { householdId: HOUSEHOLD, userId: account.userId, familyMemberId: account.familyMemberId };
    },
    async activeClients(_householdId, memberId) {
      return options?.clientsByFamilyMember?.[memberId] ?? clients;
    },
    async job() {
      return { id: "job-1", external_reporting_system: options?.externalReporting ?? "Ministry" };
    },
    async programCount() {
      return options?.programCount ?? 0;
    },
    async programBelongsToJob() {
      return false;
    },
    async visitDefaults() {
      return [];
    },
    async findByImportKey(_householdId, importKey) {
      const row = rows.find((item) => item.import_key === importKey);
      return row ? { id: row.id } : null;
    },
    async insertTreatment(data) {
      if (rows.some((item) => item.import_key === data.import_key)) {
        throw new IntakeImportKeyConflict();
      }
      rows.push(data);
      return { id: data.id };
    },
  };
  return { store, rows };
}

const payload = {
  client_name: "דנה",
  occurred_date: "2026-09-30",
  occurred_time: "16:30",
  visit_type: "מרפאה",
  external_id: "response-1",
  note_1: "סיכום",
  reported_to_external_system: true,
};

test("creates a treatment and returns the same id for the same external_id", async () => {
  const { store, rows } = memoryStore();
  const first = await ingestTreatmentIntake({
    authorization: `Bearer ${TOKEN}`,
    payload,
    store,
    newId: () => "treatment-1",
  });
  assert.equal(first.status, 201);
  if (first.status === 201) assert.equal(first.body.id, "treatment-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.client_id, "dana");
  assert.equal(rows[0]?.visit_type, "clinic");
  assert.equal(rows[0]?.amount, "350.00");
  assert.equal(rows[0]?.note_1, "סיכום");
  assert.equal(rows[0]?.reported_to_external_system, true);
  assert.equal(rows[0]?.import_key, "gform:user-1:response-1");

  const second = await ingestTreatmentIntake({
    authorization: `Bearer ${TOKEN}`,
    payload: { ...payload, client_name: "someone else" },
    store,
  });
  assert.deepEqual(second, { status: 200, body: { id: "treatment-1" } });
  assert.equal(rows.length, 1);
});

test("a conflicting insert still returns the existing treatment", async () => {
  const { store, rows } = memoryStore();
  rows.push({
    id: "existing",
    household_id: HOUSEHOLD,
    client_id: "dana",
    family_id: null,
    job_id: "job-1",
    program_id: null,
    occurred_at: new Date("2026-09-30T00:00:00.000Z"),
    amount: "350.00",
    currency: "ILS",
    visit_type: "clinic",
    note_1: null,
    note_2: null,
    note_3: null,
    reported_to_external_system: false,
    import_key: "gform:user-1:response-1",
  });
  const originalFind = store.findByImportKey;
  let lookups = 0;
  store.findByImportKey = async (householdId, importKey) => {
    lookups += 1;
    if (lookups === 1) return null;
    return originalFind(householdId, importKey);
  };
  const result = await ingestTreatmentIntake({
    authorization: `Bearer ${TOKEN}`,
    payload,
    store,
    newId: () => "should-not-stick",
  });
  assert.deepEqual(result, { status: 200, body: { id: "existing" } });
  assert.equal(rows.length, 1);
});

test("rejects an unknown token", async () => {
  const { store } = memoryStore();
  const result = await ingestTreatmentIntake({
    authorization: "Bearer nope",
    payload,
    store,
  });
  assert.equal(result.status, 401);
});

test("unknown client is 404 and a shared first name is 409", async () => {
  const { store } = memoryStore({
    clients: [
      client({ id: "a", first_name: "דנה", last_name: "כהן" }),
      client({ id: "b", first_name: "דנה", last_name: "לוי" }),
    ],
  });
  const missing = await ingestTreatmentIntake({
    authorization: `Bearer ${TOKEN}`,
    payload: { ...payload, external_id: "missing", client_name: "רונית" },
    store,
  });
  assert.equal(missing.status, 404);
  const ambiguous = await ingestTreatmentIntake({
    authorization: `Bearer ${TOKEN}`,
    payload: { ...payload, external_id: "amb", client_name: "דנה" },
    store,
  });
  assert.equal(ambiguous.status, 409);
  if (ambiguous.status === 409) {
    assert.deepEqual(ambiguous.body.candidates, ["דנה כה", "דנה לו"]);
  }
});

test("each user's token matches only that user's clients", async () => {
  const tokenA = "token-a";
  const tokenB = "token-b";
  const { store, rows } = memoryStore({
    accounts: {
      [hashTreatmentIntakeToken(tokenA)]: { userId: "user-a", familyMemberId: "fm-a" },
      [hashTreatmentIntakeToken(tokenB)]: { userId: "user-b", familyMemberId: "fm-b" },
    },
    clientsByFamilyMember: {
      "fm-a": [client({ id: "dana-a", first_name: "דנה", last_name: "כהן", default_job_id: "job-a" })],
      "fm-b": [client({ id: "dana-b", first_name: "דנה", last_name: "לוי", default_job_id: "job-b" })],
    },
  });
  const result = await ingestTreatmentIntake({
    authorization: `Bearer ${tokenA}`,
    payload: { ...payload, external_id: "from-a" },
    store,
    newId: () => "treatment-a",
  });
  assert.equal(result.status, 201);
  assert.equal(rows[0]?.client_id, "dana-a");
  assert.equal(rows[0]?.import_key, "gform:user-a:from-a");

  const other = await ingestTreatmentIntake({
    authorization: `Bearer ${tokenB}`,
    payload: { ...payload, client_name: "דנה ל", external_id: "from-b" },
    store,
    newId: () => "treatment-b",
  });
  assert.equal(other.status, 201);
  assert.equal(rows[1]?.client_id, "dana-b");
});

test("a token for a user who is not linked to a family member is rejected", async () => {
  const { store } = memoryStore({ familyMemberId: null });
  const result = await ingestTreatmentIntake({
    authorization: `Bearer ${TOKEN}`,
    payload,
    store,
  });
  assert.equal(result.status, 422);
  if (result.status === 422) assert.equal(result.body.error, "user_not_linked");
});

test("requires a program when the job has programs and the client has none", async () => {
  const { store } = memoryStore({ programCount: 2 });
  const result = await ingestTreatmentIntake({
    authorization: `Bearer ${TOKEN}`,
    payload: { ...payload, external_id: "prog" },
    store,
  });
  assert.equal(result.status, 422);
  if (result.status === 422) assert.equal(result.body.error, "program_required");
});
