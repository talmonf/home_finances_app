import { prisma } from "@/lib/auth";
import { encryptSecret, decryptSecret } from "@/lib/google-calendar/token-crypto";
import { google } from "googleapis";

const GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function requireOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth configuration is incomplete");
  }
  return { clientId, clientSecret, redirectUri };
}

export function getGoogleOAuthClient() {
  const cfg = requireOAuthConfig();
  return new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
}

export function buildGoogleConsentUrl(state: string): string {
  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });
}

export async function exchangeGoogleCodeForTokens(code: string) {
  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Google did not return required tokens");
  }
  return tokens;
}

export async function saveGoogleTokensForUser(params: {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiryDateMs?: number | null;
  scope?: string | null;
  enableClinicSync?: boolean;
  enableFamilyDatesSync?: boolean;
}) {
  await prisma.users.update({
    where: { id: params.userId },
    data: {
      google_calendar_access_token_encrypted: encryptSecret(params.accessToken),
      google_calendar_refresh_token_encrypted: encryptSecret(params.refreshToken),
      google_calendar_token_expires_at: params.expiryDateMs
        ? new Date(params.expiryDateMs)
        : null,
      google_calendar_token_scope: params.scope ?? null,
      google_calendar_sync_error: null,
      google_calendar_sync_error_at: null,
      family_calendar_sync_error: null,
      family_calendar_sync_error_at: null,
      family_calendar_sync_failure_notified_at: null,
      ...(params.enableClinicSync ? { google_calendar_enabled: true } : {}),
      ...(params.enableFamilyDatesSync ? { google_calendar_sync_family_dates: true } : {}),
    },
  });
}

export async function persistRefreshedGoogleTokens(
  userId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  },
) {
  const data: {
    google_calendar_access_token_encrypted?: string;
    google_calendar_refresh_token_encrypted?: string;
    google_calendar_token_expires_at?: Date;
  } = {};
  if (tokens.access_token) {
    data.google_calendar_access_token_encrypted = encryptSecret(tokens.access_token);
  }
  if (tokens.refresh_token) {
    data.google_calendar_refresh_token_encrypted = encryptSecret(tokens.refresh_token);
  }
  if (tokens.expiry_date) {
    data.google_calendar_token_expires_at = new Date(tokens.expiry_date);
  }
  if (Object.keys(data).length === 0) return;
  await prisma.users.update({
    where: { id: userId },
    data,
  });
}

/** Drop unusable tokens so the UI shows disconnected and the user can reconnect. */
export async function clearInvalidGoogleGrantForUser(params: {
  userId: string;
  message: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  await prisma.users.update({
    where: { id: params.userId },
    data: {
      google_calendar_access_token_encrypted: null,
      google_calendar_refresh_token_encrypted: null,
      google_calendar_token_expires_at: null,
      google_calendar_token_scope: null,
      google_calendar_sync_error: params.message.slice(0, 1000),
      google_calendar_sync_error_at: now,
      family_calendar_sync_error: params.message.slice(0, 1000),
      family_calendar_sync_error_at: now,
    },
  });
}

export function decryptGoogleToken(value: string | null): string | null {
  if (!value) return null;
  return decryptSecret(value);
}
