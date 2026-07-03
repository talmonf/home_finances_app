"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentHouseholdId,
  getAuthSession,
  prisma,
  requireHouseholdMember,
} from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto/secret";
import { formatMorningError, getBusinessMe, type MorningCredentials } from "@/lib/morning";
import {
  decryptMorningCredentials,
  encryptMorningApiKeyId,
  encryptMorningApiSecret,
} from "@/lib/morning/integration";
import { parseMorningReceiptNumberingMode } from "@/lib/morning/receipt-numbering";
import { clearMorningTokenCache } from "@/lib/morning/client";
import { jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";

const SETTINGS_PATH = "/dashboard/private-clinic/settings";

function redirectWithMorningFlash(
  kind: "ok" | "error",
  message: string,
  jobId?: string,
): never {
  const params = new URLSearchParams();
  params.set("morning", kind === "ok" ? "saved" : "error");
  params.set("morningReason", message);
  if (jobId) params.set("morningJob", jobId);
  redirect(`${SETTINGS_PATH}?${params.toString()}`);
}

async function getUserFamilyMemberId(householdId: string): Promise<string | null> {
  const session = await getAuthSession();
  if (!session?.user?.id) return null;
  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  return user?.family_member_id ?? null;
}

async function assertJobInScope(householdId: string, jobId: string): Promise<boolean> {
  const userFm = await getUserFamilyMemberId(householdId);
  const job = await prisma.jobs.findFirst({
    where: jobsWhereActiveForPrivateClinicPickers({
      householdId,
      familyMemberId: userFm,
      includeJobIds: [jobId],
    }),
    select: { id: true },
  });
  return Boolean(job);
}

function parseEnvironment(formData: FormData): "sandbox" | "production" {
  return (formData.get("environment") as string)?.trim() === "production" ? "production" : "sandbox";
}

async function resolveMorningCredentialsFromForm(
  jobId: string,
  formData: FormData,
): Promise<MorningCredentials | null> {
  const environment = parseEnvironment(formData);
  const apiKeyIdInput = (formData.get("api_key_id") as string)?.trim() || "";
  const apiSecretInput = (formData.get("api_secret") as string)?.trim() || "";

  const existing = await prisma.job_morning_integrations.findUnique({
    where: { job_id: jobId },
  });

  let apiKeyId = apiKeyIdInput;
  let apiSecret = apiSecretInput;

  if (!apiKeyId && existing?.api_key_id_encrypted) {
    try {
      apiKeyId = decryptSecret(existing.api_key_id_encrypted);
    } catch {
      apiKeyId = "";
    }
  }
  if (!apiSecret && existing?.api_secret_encrypted) {
    try {
      apiSecret = decryptSecret(existing.api_secret_encrypted);
    } catch {
      apiSecret = "";
    }
  }

  if (!apiKeyId || !apiSecret) return null;
  return { apiKeyId, apiSecret, environment };
}

async function persistMorningCredentials(
  householdId: string,
  jobId: string,
  formData: FormData,
  patch?: { last_error?: string | null; business_id?: string | null; business_name?: string | null; business_tax_id?: string | null; last_tested_at?: Date },
) {
  const environment = parseEnvironment(formData);
  const enabled = (formData.get("enabled") as string)?.trim() === "1";
  const receiptNumberingMode = parseMorningReceiptNumberingMode(
    formData.get("receipt_numbering_mode") as string,
  );
  const apiKeyId = (formData.get("api_key_id") as string)?.trim() || "";
  const apiSecret = (formData.get("api_secret") as string)?.trim() || "";

  const existing = await prisma.job_morning_integrations.findUnique({
    where: { job_id: jobId },
  });

  const nextKeyEncrypted = apiKeyId
    ? encryptMorningApiKeyId(apiKeyId)
    : existing?.api_key_id_encrypted;
  const nextSecretEncrypted = apiSecret
    ? encryptMorningApiSecret(apiSecret)
    : existing?.api_secret_encrypted;

  if (!nextKeyEncrypted || !nextSecretEncrypted) {
    return false;
  }

  await prisma.job_morning_integrations.upsert({
    where: { job_id: jobId },
    create: {
      job_id: jobId,
      household_id: householdId,
      enabled,
      environment,
      api_key_id_encrypted: nextKeyEncrypted,
      api_secret_encrypted: nextSecretEncrypted,
      default_document_type: 400,
      receipt_numbering_mode: receiptNumberingMode,
      last_error: patch?.last_error ?? null,
      business_id: patch?.business_id ?? null,
      business_name: patch?.business_name ?? null,
      business_tax_id: patch?.business_tax_id ?? null,
      last_tested_at: patch?.last_tested_at ?? null,
    },
    update: {
      enabled,
      environment,
      api_key_id_encrypted: nextKeyEncrypted,
      api_secret_encrypted: nextSecretEncrypted,
      receipt_numbering_mode: receiptNumberingMode,
      ...patch,
    },
  });

  return true;
}

export async function saveMorningIntegration(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const jobId = (formData.get("job_id") as string)?.trim() || "";

  if (!jobId || !(await assertJobInScope(householdId, jobId))) {
    redirectWithMorningFlash("error", "job");
  }

  const saved = await persistMorningCredentials(householdId, jobId, formData, { last_error: null });
  if (!saved) {
    redirectWithMorningFlash("error", "missing_credentials", jobId);
  }

  const creds = await resolveMorningCredentialsFromForm(jobId, formData);
  if (creds) clearMorningTokenCache(creds);

  revalidatePath(SETTINGS_PATH);
  redirectWithMorningFlash("ok", "saved", jobId);
}

export async function testMorningIntegration(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const jobId = (formData.get("job_id") as string)?.trim() || "";
  if (!jobId || !(await assertJobInScope(householdId, jobId))) {
    redirectWithMorningFlash("error", "job");
  }

  const creds = await resolveMorningCredentialsFromForm(jobId, formData);
  if (!creds) {
    redirectWithMorningFlash("error", "missing_credentials", jobId);
  }

  clearMorningTokenCache(creds!);

  try {
    const business = await getBusinessMe(creds!);
    const saved = await persistMorningCredentials(householdId, jobId, formData, {
      business_id: business.id ?? null,
      business_name: business.name ?? null,
      business_tax_id: business.taxId ?? null,
      last_tested_at: new Date(),
      last_error: null,
    });
    if (!saved) {
      redirectWithMorningFlash("error", "missing_credentials", jobId);
    }
    revalidatePath(SETTINGS_PATH);
    redirectWithMorningFlash("ok", "test_ok", jobId);
  } catch (err) {
    const message = formatMorningError(err);
    await persistMorningCredentials(householdId, jobId, formData, {
      last_error: message,
      last_tested_at: new Date(),
    });
    revalidatePath(SETTINGS_PATH);
    redirectWithMorningFlash("error", message, jobId);
  }
}

export async function disconnectMorningIntegration(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const jobId = (formData.get("job_id") as string)?.trim() || "";
  if (!jobId || !(await assertJobInScope(householdId, jobId))) {
    redirectWithMorningFlash("error", "job");
  }

  const row = await prisma.job_morning_integrations.findUnique({ where: { job_id: jobId } });
  if (row) {
    const creds = decryptMorningCredentials(row);
    if (creds) clearMorningTokenCache(creds);
  }

  await prisma.job_morning_integrations.deleteMany({
    where: { job_id: jobId, household_id: householdId },
  });

  revalidatePath(SETTINGS_PATH);
  redirectWithMorningFlash("ok", "disconnected", jobId);
}
