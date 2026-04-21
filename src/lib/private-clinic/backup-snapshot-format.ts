import { createHash } from "crypto";

export const PRIVATE_CLINIC_BACKUP_VERSION = 1;

export type SnapshotManifest = {
  schemaVersion: number;
  createdAt: string;
  householdId: string;
  tables: string[];
};

export type SnapshotPayload = {
  manifest: SnapshotManifest;
  data: Record<string, unknown[]>;
};

export function snapshotChecksumSha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function parseAndValidateSnapshotText(snapshotText: string): SnapshotPayload {
  const parsed = JSON.parse(snapshotText) as SnapshotPayload;
  if (!parsed?.manifest || !parsed?.data) throw new Error("Invalid snapshot format");
  if (parsed.manifest.schemaVersion !== PRIVATE_CLINIC_BACKUP_VERSION) {
    throw new Error(`Unsupported snapshot version ${String(parsed.manifest.schemaVersion)}`);
  }
  return parsed;
}

export async function dryRunRestorePrivateClinicSnapshot(snapshot: SnapshotPayload, householdId: string) {
  const data = snapshot.data;
  const tableNames = Object.keys(data);
  const rowCounts = Object.fromEntries(
    tableNames.map((table) => [table, Array.isArray(data[table]) ? (data[table] as unknown[]).length : 0]),
  );
  return {
    ok: snapshot.manifest.householdId === householdId,
    expectedHouseholdId: snapshot.manifest.householdId,
    targetHouseholdId: householdId,
    tableNames,
    rowCounts,
  };
}
