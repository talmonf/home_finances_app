import type { RenewalRow } from "@/lib/upcoming-renewals/compute";

const REDUNDANT_FAMILY_RENEWAL_TYPES = new Set([
  "Birthday",
  "Anniversary",
  "יום הולדת",
  "יום נישואין",
]);

const HIDDEN_EMAIL_OWNERS = new Set(["Household", "משק הבית"]);

const FAMILY_EVENT_CATEGORIES = new Set(["Birthday", "Anniversary", "Special date"]);

/** Middle segments after the date for birthday/anniversary rows. */
export function renewalEmailLineSegments(row: RenewalRow): string[] {
  const segments: string[] = [row.itemName];
  const renewalType = row.renewalType.trim();
  if (renewalType && !REDUNDANT_FAMILY_RENEWAL_TYPES.has(renewalType)) {
    segments.push(renewalType);
  }
  if (row.extraEmailSegments?.length) {
    segments.push(...row.extraEmailSegments);
  }
  const owner = row.owner.trim();
  if (owner && owner !== row.itemName && !HIDDEN_EMAIL_OWNERS.has(owner)) {
    segments.push(owner);
  }
  return segments;
}

function renewalEmailLineSegmentsDefault(row: RenewalRow): string[] {
  const segments: string[] = [row.renewalType, row.itemName];
  const owner = row.owner.trim();
  if (owner && owner !== row.itemName) {
    segments.push(owner);
  }
  return segments;
}

export function renewalEmailMiddleSegments(row: RenewalRow): string[] {
  return FAMILY_EVENT_CATEGORIES.has(row.category)
    ? renewalEmailLineSegments(row)
    : renewalEmailLineSegmentsDefault(row);
}
