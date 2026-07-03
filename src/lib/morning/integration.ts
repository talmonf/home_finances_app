import { prisma } from "@/lib/auth";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
import type { MorningReceiptNumberingMode } from "@/generated/prisma/client";
import type { MorningEnvironment } from "./config";
import type { MorningCredentials } from "./client";

export type JobMorningIntegrationRow = {
  job_id: string;
  household_id: string;
  enabled: boolean;
  environment: MorningEnvironment;
  api_key_id_encrypted: string | null;
  api_secret_encrypted: string | null;
  business_id: string | null;
  business_name: string | null;
  business_tax_id: string | null;
  default_document_type: number;
  receipt_numbering_mode: MorningReceiptNumberingMode;
  last_tested_at: Date | null;
  last_error: string | null;
};

export type MorningNumberingConfig = {
  enabled: boolean;
  mode: MorningReceiptNumberingMode;
};

export function decryptMorningCredentials(row: JobMorningIntegrationRow): MorningCredentials | null {
  if (!row.api_key_id_encrypted || !row.api_secret_encrypted) return null;
  try {
    return {
      apiKeyId: decryptSecret(row.api_key_id_encrypted),
      apiSecret: decryptSecret(row.api_secret_encrypted),
      environment: row.environment,
    };
  } catch {
    return null;
  }
}

export async function getJobMorningIntegration(
  householdId: string,
  jobId: string,
): Promise<JobMorningIntegrationRow | null> {
  const row = await prisma.job_morning_integrations.findFirst({
    where: { household_id: householdId, job_id: jobId },
  });
  return row as JobMorningIntegrationRow | null;
}

export async function isMorningEnabledForJob(
  householdId: string,
  jobId: string,
): Promise<boolean> {
  const row = await getJobMorningIntegration(householdId, jobId);
  return Boolean(row?.enabled && row.api_key_id_encrypted && row.api_secret_encrypted);
}

export async function getMorningCredentialsForJob(
  householdId: string,
  jobId: string,
): Promise<MorningCredentials | null> {
  const row = await getJobMorningIntegration(householdId, jobId);
  if (!row?.enabled) return null;
  return decryptMorningCredentials(row);
}

export async function getMorningEnabledJobIds(householdId: string): Promise<Set<string>> {
  const rows = await prisma.job_morning_integrations.findMany({
    where: {
      household_id: householdId,
      enabled: true,
      api_key_id_encrypted: { not: null },
      api_secret_encrypted: { not: null },
    },
    select: { job_id: true },
  });
  return new Set(rows.map((r) => r.job_id));
}

function rowToMorningNumberingConfig(row: {
  enabled: boolean;
  api_key_id_encrypted: string | null;
  api_secret_encrypted: string | null;
  receipt_numbering_mode: MorningReceiptNumberingMode;
}): MorningNumberingConfig {
  return {
    enabled: Boolean(row.enabled && row.api_key_id_encrypted && row.api_secret_encrypted),
    mode: row.receipt_numbering_mode,
  };
}

export async function getMorningNumberingConfigMapForHousehold(
  householdId: string,
): Promise<Record<string, MorningNumberingConfig>> {
  const rows = await prisma.job_morning_integrations.findMany({
    where: { household_id: householdId },
    select: {
      job_id: true,
      enabled: true,
      api_key_id_encrypted: true,
      api_secret_encrypted: true,
      receipt_numbering_mode: true,
    },
  });
  const out: Record<string, MorningNumberingConfig> = {};
  for (const row of rows) {
    out[row.job_id] = rowToMorningNumberingConfig(row);
  }
  return out;
}

export async function getMorningNumberingConfigByJobIds(
  householdId: string,
  jobIds: string[],
): Promise<Map<string, MorningNumberingConfig>> {
  if (jobIds.length === 0) return new Map();
  const rows = await prisma.job_morning_integrations.findMany({
    where: { household_id: householdId, job_id: { in: jobIds } },
    select: {
      job_id: true,
      enabled: true,
      api_key_id_encrypted: true,
      api_secret_encrypted: true,
      receipt_numbering_mode: true,
    },
  });
  return new Map(rows.map((row) => [row.job_id, rowToMorningNumberingConfig(row)]));
}

export function encryptMorningApiKeyId(value: string): string {
  return encryptSecret(value);
}

export function encryptMorningApiSecret(value: string): string {
  return encryptSecret(value);
}

export function maskApiKeyId(apiKeyId: string): string {
  if (apiKeyId.length <= 8) return "••••••••";
  return `${apiKeyId.slice(0, 4)}••••${apiKeyId.slice(-4)}`;
}
