/** True for Vercel-scheduled cron HTTP invocations (not a browser session). */
export function isVercelCronInvocation(req: Request): boolean {
  if (process.env.VERCEL !== "1") return false;
  const ua = req.headers.get("user-agent") ?? "";
  if (ua.startsWith("vercel-cron/")) return true;
  if (req.headers.get("x-vercel-cron-schedule")) return true;
  if (req.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  if (isVercelCronInvocation(req)) return true;
  return false;
}

/** @deprecated Use isAuthorizedCronRequest */
export const isAuthorizedRenewalCronRequest = isAuthorizedCronRequest;
