"use client";

import { useState } from "react";
import { FAMILY_RELATIONSHIP_OPTIONS } from "@/lib/family-members/relationship-options";
import {
  isGrandchildRelationship,
  type FamilyMemberParentOption,
} from "@/lib/family-members/grandchild-parents";

type Props = {
  isHebrew: boolean;
  members: FamilyMemberParentOption[];
  excludeMemberId?: string | null;
  defaultRelationship?: string;
  defaultParentAId?: string | null;
  defaultParentBId?: string | null;
};

export function FamilyMemberRelationshipFields({
  isHebrew,
  members,
  excludeMemberId,
  defaultRelationship = "",
  defaultParentAId = "",
  defaultParentBId = "",
}: Props) {
  const [relationship, setRelationship] = useState(defaultRelationship);
  const showParents = isGrandchildRelationship(relationship);
  const parentOptions = members.filter((m) => m.id !== excludeMemberId);

  return (
    <>
      <div>
        <label htmlFor="relationship" className="mb-1 block text-xs font-medium text-slate-400">
          {isHebrew ? "קשר משפחתי" : "Relationship"}
        </label>
        <select
          id="relationship"
          name="relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">—</option>
          {FAMILY_RELATIONSHIP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {isHebrew ? o.labelHe : o.labelEn}
            </option>
          ))}
        </select>
      </div>
      {showParents ? (
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <div>
            <label htmlFor="parent_a_family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "אב" : "Father"}
            </label>
            <select
              id="parent_a_family_member_id"
              name="parent_a_family_member_id"
              defaultValue={defaultParentAId ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">—</option>
              {parentOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="parent_b_family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "אם" : "Mother"}
            </label>
            <select
              id="parent_b_family_member_id"
              name="parent_b_family_member_id"
              defaultValue={defaultParentBId ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">—</option>
              {parentOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name="parent_a_family_member_id" value="" />
          <input type="hidden" name="parent_b_family_member_id" value="" />
        </>
      )}
    </>
  );
}
