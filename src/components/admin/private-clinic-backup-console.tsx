"use client";

import { useState } from "react";

type HouseholdOption = { id: string; name: string };
type BackupRow = {
  id: string;
  household_id: string;
  snapshot_version: number;
  snapshot_checksum: string;
  snapshot_bytes: number;
  notes: string | null;
  created_by_super_admin_email: string | null;
  created_at: string;
};

export function PrivateClinicBackupConsole({ households }: { households: HouseholdOption[] }) {
  const [householdId, setHouseholdId] = useState(households[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [snapshotText, setSnapshotText] = useState("");

  async function loadBackups() {
    if (!householdId) return;
    const res = await fetch(`/api/admin/private-clinic-backups?household_id=${encodeURIComponent(householdId)}`);
    const j = (await res.json()) as { backups?: BackupRow[]; error?: string };
    if (!res.ok) {
      setMsg(j.error ?? "Failed to load backups");
      return;
    }
    setBackups(j.backups ?? []);
    setMsg(`Loaded ${j.backups?.length ?? 0} backups.`);
  }

  async function createSnapshot() {
    if (!householdId) return;
    setMsg("Creating snapshot...");
    const res = await fetch("/api/admin/private-clinic-backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ household_id: householdId, notes: note }),
    });
    const j = (await res.json()) as { ok?: boolean; error?: string };
    setMsg(res.ok ? "Snapshot created." : j.error ?? "Snapshot failed");
    if (res.ok) await loadBackups();
  }

  async function restore(mode: "dry_run" | "apply", snapshotId?: string) {
    if (!householdId) return;
    setMsg(mode === "dry_run" ? "Running dry-run..." : "Applying restore...");
    const res = await fetch("/api/admin/private-clinic-backups/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        household_id: householdId,
        mode,
        snapshot_id: snapshotId,
        snapshot_json_text: snapshotText.trim() || undefined,
      }),
    });
    const j = (await res.json()) as { ok?: boolean; error?: string; dryRun?: { tableNames?: string[] } };
    if (!res.ok) {
      setMsg(j.error ?? "Restore failed");
      return;
    }
    setMsg(
      mode === "dry_run"
        ? `Dry-run OK. ${j.dryRun?.tableNames?.length ?? 0} table(s) in snapshot.`
        : "Restore applied successfully.",
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
        <label className="block text-sm text-slate-300">
          Household
          <select
            value={householdId}
            onChange={(e) => setHouseholdId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.id.slice(0, 8)})
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadBackups} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold">
            Load backups
          </button>
          <button onClick={createSnapshot} className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950">
            Create backup snapshot
          </button>
          <button onClick={() => restore("dry_run")} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950">
            Dry-run restore (typed JSON)
          </button>
          <button onClick={() => restore("apply")} className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-slate-950">
            Apply restore (typed JSON)
          </button>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional snapshot note"
          className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <textarea
          value={snapshotText}
          onChange={(e) => setSnapshotText(e.target.value)}
          placeholder="Optional snapshot JSON for restore (paste backup file text)"
          rows={8}
          className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-xs text-slate-100 font-mono"
        />
        {msg && <p className="text-xs text-slate-300">{msg}</p>}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Saved snapshots</h2>
        {backups.length === 0 ? (
          <p className="text-xs text-slate-400">No snapshots loaded.</p>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div key={b.id} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
                <p>{new Date(b.created_at).toLocaleString("en-CA")} | {b.id}</p>
                <p>bytes={b.snapshot_bytes}, checksum={b.snapshot_checksum.slice(0, 16)}...</p>
                <div className="mt-2 flex gap-2">
                  <a className="rounded bg-sky-500 px-2 py-1 font-semibold text-slate-950" href={`/api/admin/private-clinic-backups/${b.id}/download`}>
                    Download JSON
                  </a>
                  <button onClick={() => restore("dry_run", b.id)} className="rounded bg-amber-500 px-2 py-1 font-semibold text-slate-950">
                    Dry-run restore
                  </button>
                  <button onClick={() => restore("apply", b.id)} className="rounded bg-rose-500 px-2 py-1 font-semibold text-slate-950">
                    Apply restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
