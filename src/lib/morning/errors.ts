export class MorningApiError extends Error {
  readonly statusCode: number;
  readonly code: string | undefined;
  readonly details: unknown;

  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message);
    this.name = "MorningApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function formatMorningError(err: unknown): string {
  if (err instanceof MorningApiError) {
    if (err.code) return `${err.message} (${err.code})`;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Unknown Morning API error";
}

export async function parseMorningErrorResponse(res: Response): Promise<MorningApiError> {
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore
  }
  const errorObj = body.error as Record<string, unknown> | undefined;
  const message =
    (typeof errorObj?.message === "string" && errorObj.message) ||
    (typeof body.message === "string" && body.message) ||
    `Morning API request failed (${res.status})`;
  const code = typeof errorObj?.code === "string" ? errorObj.code : undefined;
  return new MorningApiError(message, res.status, code, body);
}
