import type { TherapyReceiptPaymentMethod } from "@/generated/prisma/client";
import type { MorningEnvironment } from "./config";
import { getMorningApiBase, getMorningAuthBase } from "./config";
import { MorningApiError, parseMorningErrorResponse } from "./errors";

export type MorningCredentials = {
  apiKeyId: string;
  apiSecret: string;
  environment: MorningEnvironment;
};

type TokenCacheEntry = {
  accessToken: string;
  expiresAtMs: number;
};

const tokenCache = new Map<string, TokenCacheEntry>();

function cacheKey(creds: MorningCredentials): string {
  return `${creds.environment}:${creds.apiKeyId}`;
}

export async function fetchMorningAccessToken(creds: MorningCredentials): Promise<string> {
  const key = cacheKey(creds);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAtMs > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const authBase = getMorningAuthBase(creds.environment);
  const res = await fetch(`${authBase}/idp/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: creds.apiKeyId,
      client_secret: creds.apiSecret,
    }),
  });

  if (!res.ok) {
    throw await parseMorningErrorResponse(res);
  }

  const data = (await res.json()) as {
    accessToken?: string;
    expiresAt?: number;
  };
  if (!data.accessToken) {
    throw new MorningApiError("Morning token response missing accessToken", res.status);
  }

  const expiresAtMs =
    typeof data.expiresAt === "number" ? data.expiresAt * 1000 : Date.now() + 3_500_000;
  tokenCache.set(key, { accessToken: data.accessToken, expiresAtMs });
  return data.accessToken;
}

export function clearMorningTokenCache(creds?: MorningCredentials): void {
  if (!creds) {
    tokenCache.clear();
    return;
  }
  tokenCache.delete(cacheKey(creds));
}

export async function morningApiRequest<T>(
  creds: MorningCredentials,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await fetchMorningAccessToken(creds);
  const base = getMorningApiBase(creds.environment);
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    throw await parseMorningErrorResponse(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export type MorningBusinessMe = {
  id?: string;
  name?: string;
  taxId?: string;
  title?: string;
  exemption?: boolean;
};

export type MorningClient = {
  id: string;
  name?: string;
  taxId?: string;
  emails?: string[];
  phone?: string;
  mobile?: string;
  address?: string;
};

export type MorningClientSearchResult = {
  total?: number;
  items?: MorningClient[];
};

export type MorningIncomeRow = {
  description: string;
  quantity: number;
  price: number;
  currency: string;
  currencyRate: number;
  vatType: number;
  vatRate?: number;
};

export type MorningPaymentRow = {
  date: string;
  type: number;
  price: number;
  currency: string;
  currencyRate: number;
};

export type MorningDocumentClient = {
  id?: string;
  name: string;
  taxId?: string;
  emails?: string[];
  phone?: string;
  mobile?: string;
  address?: string;
  add?: boolean;
};

export type MorningCreateDocumentRequest = {
  type: number;
  date: string;
  lang: "he" | "en";
  currency: string;
  vatType: number;
  signed: boolean;
  description?: string;
  remarks?: string;
  client: MorningDocumentClient;
  income: MorningIncomeRow[];
  payment: MorningPaymentRow[];
};

export type MorningCreateDocumentResponse = {
  id: string;
  number: number | string;
  type?: number;
  url?: { he?: string; en?: string; origin?: string };
};

export type MorningDownloadLinks = {
  he?: string;
  en?: string;
  origin?: string;
};

export async function getBusinessMe(creds: MorningCredentials): Promise<MorningBusinessMe> {
  return morningApiRequest<MorningBusinessMe>(creds, "/businesses/me");
}

export async function searchClients(
  creds: MorningCredentials,
  query: { name?: string; taxId?: string; pageSize?: number },
): Promise<MorningClientSearchResult> {
  return morningApiRequest<MorningClientSearchResult>(creds, "/clients/search", {
    method: "POST",
    body: JSON.stringify({
      page: 1,
      pageSize: query.pageSize ?? 10,
      name: query.name,
      taxId: query.taxId,
      active: true,
    }),
  });
}

export async function createClient(
  creds: MorningCredentials,
  client: {
    name: string;
    taxId?: string;
    emails?: string[];
    phone?: string;
    address?: string;
    active?: boolean;
  },
): Promise<MorningClient> {
  return morningApiRequest<MorningClient>(creds, "/clients", {
    method: "POST",
    body: JSON.stringify({
      name: client.name,
      taxId: client.taxId || undefined,
      emails: client.emails?.length ? client.emails : undefined,
      phone: client.phone || undefined,
      address: client.address || undefined,
      active: client.active ?? true,
      country: "IL",
    }),
  });
}

export async function createDocument(
  creds: MorningCredentials,
  payload: MorningCreateDocumentRequest,
): Promise<MorningCreateDocumentResponse> {
  return morningApiRequest<MorningCreateDocumentResponse>(creds, "/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDocumentDownloadLinks(
  creds: MorningCredentials,
  documentId: string,
): Promise<MorningDownloadLinks> {
  return morningApiRequest<MorningDownloadLinks>(creds, `/documents/${documentId}/download/links`);
}

export async function downloadDocumentPdf(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new MorningApiError(`Failed to download Morning document PDF (${res.status})`, res.status);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function mapPaymentMethodToMorningType(method: TherapyReceiptPaymentMethod): number {
  switch (method) {
    case "cash":
      return 1;
    case "bank_transfer":
      return 4;
    case "credit_card":
      return 3;
    case "digital_card":
      return 10;
    default:
      return 1;
  }
}

export function formatClientDisplayName(firstName: string, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

export function formatDateYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function decimalToNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value.toString());
}
