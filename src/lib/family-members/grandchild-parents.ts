export const GRANDCHILD_RELATIONSHIPS = ["Grandson", "Granddaughter"] as const;

export type GrandchildRelationship = (typeof GRANDCHILD_RELATIONSHIPS)[number];

export function isGrandchildRelationship(value: string | null | undefined): value is GrandchildRelationship {
  return value != null && (GRANDCHILD_RELATIONSHIPS as readonly string[]).includes(value);
}

export function parseGrandchildParentIds(
  relationship: string | null,
  parentAId: string | null,
  parentBId: string | null,
): { parent_a_family_member_id: string | null; parent_b_family_member_id: string | null } {
  if (!isGrandchildRelationship(relationship)) {
    return { parent_a_family_member_id: null, parent_b_family_member_id: null };
  }
  const a = parentAId?.trim() || null;
  const b = parentBId?.trim() || null;
  if (a && b && a === b) {
    return { parent_a_family_member_id: a, parent_b_family_member_id: null };
  }
  return { parent_a_family_member_id: a, parent_b_family_member_id: b };
}

export type FamilyMemberParentOption = {
  id: string;
  full_name: string;
};

export function parentOptionsForMember(
  members: FamilyMemberParentOption[],
  excludeMemberId?: string | null,
): FamilyMemberParentOption[] {
  return members.filter((m) => m.id !== excludeMemberId);
}
