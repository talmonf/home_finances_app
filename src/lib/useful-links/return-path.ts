/** Paths where useful-link redirects are allowed (open-redirect hardening). */
export function isAllowedUsefulLinkReturnPath(path: string): boolean {
  const p = path.split("?")[0].trim();
  if (p === "/dashboard") return true;
  if (!p.startsWith("/dashboard/")) return false;
  if (p.includes("//")) return false;
  return true;
}
