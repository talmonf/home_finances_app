/** Password rules for creation, admin reset, and self-service change (OWASP-style baseline). */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Default when `PASSWORD_MAX_AGE_MONTHS` is unset. */
export const DEFAULT_PASSWORD_MAX_AGE_MONTHS = 6;

export function getPasswordMaxAgeMonths(): number {
  const raw = process.env.PASSWORD_MAX_AGE_MONTHS;
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_PASSWORD_MAX_AGE_MONTHS;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 120) {
    return DEFAULT_PASSWORD_MAX_AGE_MONTHS;
  }
  return n;
}

export type PasswordValidationResult = {
  ok: boolean;
  errors: string[];
};

/**
 * Validates password strength. Allows any Unicode; requires mixed case ASCII letters and a digit.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must include at least one lowercase letter.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must include at least one digit.");
  }

  return { ok: errors.length === 0, errors };
}

export function passwordPolicyHint(): string {
  return `At least ${PASSWORD_MIN_LENGTH} and at most ${PASSWORD_MAX_LENGTH} characters, with uppercase, lowercase, and a digit.`;
}

/** Human-readable rules for UI (e.g. change-password screen). Matches {@link validatePassword}. */
export function passwordPolicyRequirementLines(): readonly string[] {
  return [
    `Between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
    "At least one lowercase letter (a–z)",
    "At least one uppercase letter (A–Z)",
    "At least one digit (0–9)",
  ];
}

/**
 * True if password_changed_at is older than the configured max age (calendar months).
 */
export function isPasswordExpired(passwordChangedAt: Date): boolean {
  const months = getPasswordMaxAgeMonths();
  const deadline = addCalendarMonths(passwordChangedAt, months);
  return Date.now() > deadline.getTime();
}

function addCalendarMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d;
}
