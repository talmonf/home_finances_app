import { FAMILY_RELATIONSHIP_OPTIONS } from "@/lib/family-members/relationship-options";

export function FamilyRelationshipSelect({
  id = "relationship",
  name = "relationship",
  defaultValue = "",
  isHebrew,
  className = "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100",
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  isHebrew: boolean;
  className?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue} className={className}>
      <option value="">—</option>
      {FAMILY_RELATIONSHIP_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {isHebrew ? o.labelHe : o.labelEn}
        </option>
      ))}
    </select>
  );
}
