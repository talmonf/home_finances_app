import type { EntityUrlEntityKind } from "@/generated/prisma/enums";

const MAX_URL_LEN = 2048;
const MAX_TITLE_LEN = 500;
const MAX_NOTES_LEN = 2000;

export const ENTITY_URL_ALLOWED_REDIRECT_PREFIX = "/dashboard/";

export function isAllowedEntityUrlRedirect(path: string): boolean {
  if (!path.startsWith(ENTITY_URL_ALLOWED_REDIRECT_PREFIX)) return false;
  if (path.includes("//")) return false;
  return true;
}

export function normalizeAndValidateUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_URL_LEN) return null;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  return u.toString();
}

export function parseEntityUrlEntityKind(raw: string | null | undefined): EntityUrlEntityKind | null {
  const v = raw?.trim();
  if (v === "insurance_policy" || v === "savings_policy") return v;
  return null;
}

export function trimOptionalField(raw: string | null | undefined, maxLen: number): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (t.length > maxLen) return null;
  return t;
}

export function parseSortOrder(raw: string | null | undefined): number {
  const n = Number(raw?.trim());
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return 0;
  return Math.floor(n);
}

export { MAX_TITLE_LEN, MAX_NOTES_LEN };
