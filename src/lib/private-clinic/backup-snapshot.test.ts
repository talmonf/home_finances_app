import test from "node:test";
import assert from "node:assert/strict";
import {
  PRIVATE_CLINIC_BACKUP_VERSION,
  dryRunRestorePrivateClinicSnapshot,
  parseAndValidateSnapshotText,
} from "@/lib/private-clinic/backup-snapshot-format";

test("parseAndValidateSnapshotText accepts current schema version", () => {
  const text = JSON.stringify({
    manifest: {
      schemaVersion: PRIVATE_CLINIC_BACKUP_VERSION,
      createdAt: "2026-04-21T00:00:00.000Z",
      householdId: "hh-1",
      tables: ["therapy_clients"],
    },
    data: { therapy_clients: [] },
  });
  const parsed = parseAndValidateSnapshotText(text);
  assert.equal(parsed.manifest.householdId, "hh-1");
});

test("dryRunRestorePrivateClinicSnapshot validates household match", async () => {
  const snapshot = parseAndValidateSnapshotText(
    JSON.stringify({
      manifest: {
        schemaVersion: PRIVATE_CLINIC_BACKUP_VERSION,
        createdAt: "2026-04-21T00:00:00.000Z",
        householdId: "hh-2",
        tables: ["therapy_clients", "therapy_treatments"],
      },
      data: { therapy_clients: [{ id: "a" }], therapy_treatments: [] },
    }),
  );
  const ok = await dryRunRestorePrivateClinicSnapshot(snapshot, "hh-2");
  const bad = await dryRunRestorePrivateClinicSnapshot(snapshot, "hh-other");
  assert.equal(ok.ok, true);
  assert.equal(bad.ok, false);
});
