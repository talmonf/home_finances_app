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
}) {
  await prisma.users.update({
    where: { id: params.userId },
    data: {
      google_calendar_enabled: true,
      google_calendar_access_token_encrypted: encryptSecret(params.accessToken),
      google_calendar_refresh_token_encrypted: encryptSecret(params.refreshToken),
      google_calendar_token_expires_at: params.expiryDateMs
        ? new Date(params.expiryDateMs)
        : null,
      google_calendar_token_scope: params.scope ?? null,
      google_calendar_sync_error: null,
      google_calendar_sync_error_at: null,
    },
  });
}

export function decryptGoogleToken(value: string | null): string | null {
  if (!value) return null;
  return decryptSecret(value);
}
