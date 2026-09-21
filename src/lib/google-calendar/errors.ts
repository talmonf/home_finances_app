export const GOOGLE_INVALID_GRANT_USER_MESSAGE =
  "Google Calendar access expired or was revoked. Reconnect Google Calendar, then sync again.";

export function isGoogleInvalidGrant(error: unknown): boolean {
  if (error == null) return false;
  const chunks: string[] = [];
  if (error instanceof Error && error.message) chunks.push(error.message);
  if (typeof error === "string") chunks.push(error);
  if (typeof error === "object") {
    const record = error as {
      code?: unknown;
      error?: unknown;
      response?: { data?: { error?: unknown; error_description?: unknown } };
    };
    if (typeof record.code === "string") chunks.push(record.code);
    if (typeof record.error === "string") chunks.push(record.error);
    const data = record.response?.data;
    if (typeof data?.error === "string") chunks.push(data.error);
    if (typeof data?.error_description === "string") chunks.push(data.error_description);
  }
  return chunks.some((chunk) => chunk.toLowerCase().includes("invalid_grant"));
}
