"use client";

import type { ReactNode } from "react";
import { useCallback, useId, useMemo, useState } from "react";

export type FamilyMemberPosition = "father" | "mother" | "son" | "daughter";

export type LinkableClient = { id: string; first_name: string; last_name: string | null };

export type InitialFamilyMemberRow =
  | {
      kind: "existing";
      clientId: string;
      label: string;
      member_position: FamilyMemberPosition | null;
    }
  | { kind: "new"; firstName: string; position: FamilyMemberPosition };

type FamilyRow =
  | {
      key: string;
      kind: "existing";
      clientId: string;
      label: string;
      member_position: FamilyMemberPosition | null;
    }
  | {
      key: string;
      kind: "new";
      firstName: string;
      position: FamilyMemberPosition;
    };

export type FamilyMembersFormLabels = {
  sectionTitle: string;
  addMember: string;
  mainContact: string;
  advancedTitle: string;
  /** If empty, the hint paragraph under the summary is omitted. */
  advancedHint: string;
  linkExistingLabel: string;
  modalTitleAdd: string;
  modalTitleEdit: string;
  firstName: string;
  familyPosition: string;
  positionPlaceholder: string;
  father: string;
  mother: string;
  son: string;
  daughter: string;
  save: string;
  saveEdit: string;
  cancel: string;
  emptyListHint: string;
  positionUnset: string;
  editMember: string;
  removeMember: string;
};

type Props = {
  labels: FamilyMembersFormLabels;
  linkableClients: LinkableClient[];
  initialRows: InitialFamilyMemberRow[];
  initialMainSlotIndex: number;
  nameFieldSlot: ReactNode;
  startDateFieldSlot: ReactNode;
};

function clientLabel(c: LinkableClient): string {
  return [c.first_name, c.last_name ?? ""].join(" ").trim();
}

function newKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function initialRowsToState(initial: InitialFamilyMemberRow[]): FamilyRow[] {
  return initial.map((r) =>
    r.kind === "existing"
      ? {
          key: newKey(),
          kind: "existing",
          clientId: r.clientId,
          label: r.label,
          member_position: r.member_position,
        }
      : {
          key: newKey(),
          kind: "new",
          firstName: r.firstName,
          position: r.position,
        },
  );
}

function positionLabel(labels: FamilyMembersFormLabels, p: FamilyMemberPosition | null): string {
  if (!p) return labels.positionUnset;
  switch (p) {
    case "father":
      return labels.father;
    case "mother":
      return labels.mother;
    case "son":
      return labels.son;
    case "daughter":
      return labels.daughter;
    default:
      return labels.positionUnset;
  }
}

function serializeRows(rows: FamilyRow[]) {
  return rows.map((r) =>
    r.kind === "existing"
      ? {
          kind: "existing" as const,
          clientId: r.clientId,
          position: r.member_position,
        }
      : {
          kind: "new" as const,
          firstName: r.firstName.trim(),
          position: r.position,
        },
  );
}

type DraftPosition = "" | FamilyMemberPosition;

function isPosition(v: DraftPosition): v is FamilyMemberPosition {
  return v === "father" || v === "mother" || v === "son" || v === "daughter";
}

export function FamilyMembersFormSection({
  labels,
  linkableClients,
  initialRows,
  initialMainSlotIndex,
  nameFieldSlot,
  startDateFieldSlot,
}: Props) {
  const [rows, setRows] = useState<FamilyRow[]>(() => initialRowsToState(initialRows));
  const [mainSlotIndex, setMainSlotIndex] = useState(() =>
    Math.min(Math.max(0, initialMainSlotIndex), Math.max(0, initialRows.length - 1)),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftFirst, setDraftFirst] = useState("");
  const [draftPosition, setDraftPosition] = useState<DraftPosition>("");
  const modalTitleId = useId();

  const editingRow = useMemo(() => (editingKey ? rows.find((r) => r.key === editingKey) : undefined), [editingKey, rows]);
  const editingIsExisting = editingRow?.kind === "existing";
  const existingEditLabel = editingRow?.kind === "existing" ? editingRow.label : "";

  const existingIdsSelected = useMemo(
    () =>
      rows
        .filter((r): r is Extract<FamilyRow, { kind: "existing" }> => r.kind === "existing")
        .map((r) => r.clientId),
    [rows],
  );

  const linkableOptions = useMemo(
    () => [...linkableClients].sort((a, b) => clientLabel(a).localeCompare(clientLabel(b), undefined, { sensitivity: "base" })),
    [linkableClients],
  );

  const jsonPayload = useMemo(() => JSON.stringify(serializeRows(rows)), [rows]);

  const effectiveMainIndex = rows.length === 0 ? 0 : Math.min(Math.max(0, mainSlotIndex), rows.length - 1);

  const onAdvancedChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
      setRows((prev) => {
        const news = prev.filter((r): r is Extract<FamilyRow, { kind: "new" }> => r.kind === "new");
        const prevExistings = new Map(
          prev.filter((r): r is Extract<FamilyRow, { kind: "existing" }> => r.kind === "existing").map((r) => [r.clientId, r]),
        );
        const rebuiltExistings: FamilyRow[] = selected.map((id) => {
          const old = prevExistings.get(id);
          if (old) return old;
          const c = linkableClients.find((x) => x.id === id);
          return {
            key: newKey(),
            kind: "existing" as const,
            clientId: id,
            label: c ? clientLabel(c) : id,
            member_position: null,
          };
        });
        return [...rebuiltExistings, ...news];
      });
    },
    [linkableClients],
  );

  const openAddModal = useCallback(() => {
    setEditingKey(null);
    setDraftFirst("");
    setDraftPosition("");
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback(
    (key: string) => {
      const r = rows.find((x) => x.key === key);
      if (!r) return;
      setEditingKey(key);
      if (r.kind === "existing") {
        setDraftFirst("");
        const p = r.member_position;
        setDraftPosition(p === "father" || p === "mother" || p === "son" || p === "daughter" ? p : "");
      } else {
        setDraftFirst(r.firstName);
        setDraftPosition(r.position);
      }
      setModalOpen(true);
    },
    [rows],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingKey(null);
  }, []);

  const applyModal = useCallback(() => {
    if (editingKey) {
      const target = rows.find((r) => r.key === editingKey);
      if (!target) {
        closeModal();
        return;
      }
      if (target.kind === "new") {
        const name = draftFirst.trim();
        if (!name || !isPosition(draftPosition)) return;
        setRows((prev) =>
          prev.map((r) => (r.key === editingKey && r.kind === "new" ? { ...r, firstName: name, position: draftPosition } : r)),
        );
      } else {
        const pos: FamilyMemberPosition | null = draftPosition === "" ? null : isPosition(draftPosition) ? draftPosition : null;
        setRows((prev) =>
          prev.map((r) => (r.key === editingKey && r.kind === "existing" ? { ...r, member_position: pos } : r)),
        );
      }
      closeModal();
      return;
    }
    const name = draftFirst.trim();
    const pos = draftPosition;
    if (!name || !isPosition(pos)) return;
    const wasEmpty = rows.length === 0;
    setRows((prev) => [...prev, { key: newKey(), kind: "new", firstName: name, position: pos }]);
    if (wasEmpty) setMainSlotIndex(0);
    closeModal();
  }, [editingKey, rows, draftFirst, draftPosition, closeModal]);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key);
      if (idx === -1) return prev;
      const next = prev.filter((r) => r.key !== key);
      setMainSlotIndex((m) => {
        if (next.length === 0) return 0;
        if (idx < m) return m - 1;
        if (idx === m) return Math.min(m, next.length - 1);
        return m;
      });
      return next;
    });
  }, []);

  const rowLabel = useCallback(
    (r: FamilyRow) => {
      if (r.kind === "existing") return r.label;
      return r.firstName.trim() || "…";
    },
    [],
  );

  const modalTitle = editingKey ? labels.modalTitleEdit : labels.modalTitleAdd;
  const modalSaveLabel = editingKey ? labels.saveEdit : labels.save;

  return (
    <div className="space-y-3 md:col-span-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 max-w-sm flex-1 space-y-1">{nameFieldSlot}</div>
        <button
          type="button"
          onClick={openAddModal}
          className="shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
        >
          {labels.addMember}
        </button>
      </div>
      {startDateFieldSlot}

      <div>
        <label className="block text-xs font-medium text-slate-300">{labels.sectionTitle}</label>
      </div>

      <input type="hidden" name="family_members_json" value={jsonPayload} readOnly />
      <input type="hidden" name="main_member_slot_index" value={String(effectiveMainIndex)} readOnly />

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">{labels.emptyListHint}</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-700 bg-slate-950/40">
          {rows.map((r, i) => (
            <li key={r.key} className="flex flex-wrap items-center gap-2 px-2 py-2 text-sm sm:gap-3 sm:px-3">
              <span className="min-w-0 flex-1 text-slate-200">{rowLabel(r)}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {positionLabel(labels, r.kind === "existing" ? r.member_position : r.position)}
              </span>
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                <input
                  type="radio"
                  name="main_family_slot"
                  checked={effectiveMainIndex === i}
                  onChange={() => setMainSlotIndex(i)}
                  className="border-slate-500 text-sky-500"
                />
                {labels.mainContact}
              </label>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal(r.key)}
                  className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  {labels.editMember}
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(r.key)}
                  className="rounded border border-rose-800/60 px-2 py-0.5 text-xs text-rose-300 hover:bg-rose-950/40"
                >
                  {labels.removeMember}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-lg border border-slate-800 bg-slate-950/30 p-2 text-slate-500">
        <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-400">
          {labels.advancedTitle}
        </summary>
        {labels.advancedHint ? <p className="mt-2 text-xs text-slate-500">{labels.advancedHint}</p> : null}
        <label className="mt-2 block text-xs text-slate-500">{labels.linkExistingLabel}</label>
        <select
          multiple
          className="mt-1 max-h-24 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300"
          value={existingIdsSelected}
          onChange={onAdvancedChange}
        >
          {linkableOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {clientLabel(c)}
            </option>
          ))}
        </select>
      </details>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-3 py-4 sm:px-4 sm:py-6"
          onClick={closeModal}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={modalTitleId} className="text-sm font-semibold text-slate-100">
              {modalTitle}
            </h3>
            {editingIsExisting ? <p className="mt-2 text-sm text-slate-300">{existingEditLabel}</p> : null}
            <div className="mt-3 space-y-3">
              {!editingIsExisting ? (
                <div className="space-y-1">
                  <label className="block text-xs text-slate-400">{labels.firstName}</label>
                  <input
                    value={draftFirst}
                    onChange={(e) => setDraftFirst(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    autoFocus={!editingIsExisting}
                  />
                </div>
              ) : null}
              <div className="space-y-1">
                <label className="block text-xs text-slate-400">{labels.familyPosition}</label>
                <select
                  value={draftPosition}
                  onChange={(e) => setDraftPosition((e.target.value || "") as DraftPosition)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  autoFocus={editingIsExisting}
                >
                  <option value="">{labels.positionPlaceholder}</option>
                  <option value="father">{labels.father}</option>
                  <option value="mother">{labels.mother}</option>
                  <option value="son">{labels.son}</option>
                  <option value="daughter">{labels.daughter}</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300">
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={applyModal}
                className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                {modalSaveLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
