export const DEFAULT_SYSTEM_SESSION_LENGTH_MINUTES = 50;

function parsePositiveMinutes(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const rounded = Math.trunc(raw);
  if (rounded <= 0) return null;
  return rounded;
}

export function getSystemDefaultSessionMinutes(): number {
  const envValue = process.env.PRIVATE_CLINIC_DEFAULT_SESSION_MINUTES;
  if (!envValue) return DEFAULT_SYSTEM_SESSION_LENGTH_MINUTES;
  const parsed = Number(envValue);
  return parsePositiveMinutes(parsed) ?? DEFAULT_SYSTEM_SESSION_LENGTH_MINUTES;
}

export function resolveSessionDurationMinutes(params: {
  systemDefaultMinutes?: number | null;
  therapySettingsDefaultMinutes?: number | null;
  jobDefaultMinutes?: number | null;
  programDefaultMinutes?: number | null;
  appointmentDurationMinutes?: number | null;
}): number | null {
  const candidates = [
    params.systemDefaultMinutes,
    params.therapySettingsDefaultMinutes,
    params.jobDefaultMinutes,
    params.programDefaultMinutes,
    params.appointmentDurationMinutes,
  ];

  let resolved: number | null = null;
  for (const value of candidates) {
    const parsed = parsePositiveMinutes(value);
    if (parsed) resolved = parsed;
  }
  return resolved;
}
