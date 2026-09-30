import assert from "node:assert/strict";
import test from "node:test";
import { matchIntakeClients, type IntakeClientName } from "@/lib/therapy/intake-client-match";

const clients: IntakeClientName[] = [
  { id: "dana", first_name: "דנה", last_name: null },
  { id: "dana-k", first_name: "דנה", last_name: "כהן" },
  { id: "dana-l", first_name: "דנה", last_name: "לוי" },
  { id: "bat-el", first_name: "בת אל", last_name: "ישראלי" },
  { id: "bat", first_name: "בת", last_name: "אלמוני" },
  { id: "noa", first_name: "Noa", last_name: "Levi" },
];

test("unique first name matches exactly", () => {
  const result = matchIntakeClients("Noa", clients);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.client.id, "noa");
});

test("first name match ignores Latin case and extra spaces", () => {
  const result = matchIntakeClients("  noa  ", clients);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.client.id, "noa");
});

test("one-letter last-name prefix disambiguates a shared first name", () => {
  const result = matchIntakeClients("דנה ל", clients);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.client.id, "dana-l");
});

test("two-letter last-name prefix disambiguates a shared first name", () => {
  const result = matchIntakeClients("דנה כה", clients);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.client.id, "dana-k");
});

test("multi-word first name matches the whole answer", () => {
  const result = matchIntakeClients("בת אל", clients);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.client.id, "bat-el");
});

test("multi-word first name plus a last-name prefix selects that client", () => {
  const result = matchIntakeClients("בת אל י", clients);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.client.id, "bat-el");
});

test("shared first name without a prefix is ambiguous", () => {
  const result = matchIntakeClients("דנה", clients);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "ambiguous_client");
    assert.deepEqual(result.candidates, ["דנה", "דנה כה", "דנה לו"]);
  }
});

test("unknown name does not match", () => {
  const result = matchIntakeClients("רונית", clients);
  assert.deepEqual(result, { ok: false, error: "client_not_found", candidates: [] });
});

test("a prefix that still matches two last names is ambiguous", () => {
  const result = matchIntakeClients("דנה כ", [
    { id: "a", first_name: "דנה", last_name: "כהן" },
    { id: "b", first_name: "דנה", last_name: "כהנא" },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "ambiguous_client");
    assert.deepEqual(result.candidates, ["דנה כה", "דנה כה"]);
  }
});
