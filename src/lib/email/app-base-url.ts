export function getAppBaseUrl(): string {
  const fromAuth = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (fromAuth) return fromAuth;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}
