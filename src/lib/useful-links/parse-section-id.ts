import { DASHBOARD_SECTIONS, type SectionId } from "@/lib/dashboard-sections";

const SECTION_IDS = new Set<string>(DASHBOARD_SECTIONS.map((s) => s.id));

export function parseDashboardSectionId(raw: string | null | undefined): SectionId | null {
  const v = raw?.trim();
  if (!v || !SECTION_IDS.has(v)) return null;
  return v as SectionId;
}
