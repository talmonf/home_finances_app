"use server";

import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  requireSuperAdmin,
  getAuthSession,
} from "@/lib/auth";
import { ensureDefaultExpenseCategories, ensureTherapySettings } from "@/lib/therapy/bootstrap";
import { materializeSeriesAppointments } from "@/lib/therapy/series-materialize";
import {
  appointmentToSnapshot,
  logTherapyAppointmentAudit,
} from "@/lib/therapy/appointment-audit";
import { parseTherapyOccurredAtFromForm } from "@/lib/therapy/occurred-at-form";
import { parseVisitCount, parseVisitWeeks } from "@/lib/therapy/visit-frequency";
import { isEligiblePetrolTankerOnFillDate } from "@/lib/family-member-age";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PRIVATE_CLINIC_NAV_ITEMS } from "@/lib/private-clinic-nav";
import type {
  TherapyAppointmentRecurrence,
  TherapyAppointmentStatus,
  TherapyBillingBasis,
  TherapyBillingTiming,
  TherapyClientRelationshipType,
  TherapyFamilyMemberPosition,
  TherapyReceiptKind,
  TherapyReceiptPaymentMethod,
  TherapyReceiptRecipientType,
  TherapyTreatmentPaymentMethod,
  TherapyVisitType,
} from "@/generated/prisma/enums";
import { TherapyAppointmentAuditAction } from "@/generated/prisma/enums";

const BASE = "/dashboard/private-clinic";
const ADMIN_HOUSEHOLDS = "/admin/households";

function endOfUtcDayForReceipt(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}
const CLIENT_STATUS_OPTIONS = new Set([
  "none",
  "exists",
  "filed_in_hospitalization",
  "filed_recognized",
  "filed_rejected",
  "filed_appeal",
  "filed_worsening",
]);
const APPOINTMENT_CHANGE_REASON_OTHER = "other";

function parseAppointmentChangeReason(
  formData: FormData,
  fieldName: "cancellation_reason" | "reschedule_reason",
  notesFieldName: "cancellation_notes" | "reschedule_notes",
): string | null {
  const reason = (formData.get(fieldName) as string | null)?.trim() || "";
  if (!reason) return null;
  if (reason !== APPOINTMENT_CHANGE_REASON_OTHER) return reason;
  const notes = (formData.get(notesFieldName) as string | null)?.trim() || "";
  if (!notes) return null;
  return `Other: ${notes}`;
}

function getAppointmentChangeReasonAndNotes(
  formData: FormData,
  fieldName: "cancellation_reason" | "reschedule_reason",
  notesFieldName: "cancellation_notes" | "reschedule_notes",
): { reason: string; notes: string | null } | null {
  const reason = (formData.get(fieldName) as string | null)?.trim() || "";
  if (!reason) return null;
  const notes = (formData.get(notesFieldName) as string | null)?.trim() || "";
  if (reason === APPOINTMENT_CHANGE_REASON_OTHER && !notes) return null;
  return { reason, notes: notes || null };
}

function redirectPrivateClinicScoped(
  formData: FormData,
  kind: "success" | "error",
  fallbackPath: string,
  errorKey?: string,
): never {
  const field = kind === "success" ? "redirect_on_success" : "redirect_on_error";
  let path = (formData.get(field) as string | null)?.trim() || fallbackPath;
  if (!path.startsWith(`${BASE}/`)) path = fallbackPath;
  if (kind === "error" && errorKey) {
    const sep = path.includes("?") ? "&" : "?";
    redirect(`${path}${sep}error=${encodeURIComponent(errorKey)}`);
  }
  redirect(path);
}

function redirectTherapyClientFormError(formData: FormData, fallbackPath: string, errorKey: string): never {
  let path = (formData.get("redirect_on_error") as string)?.trim() || fallbackPath;
  if (!path.startsWith(`${BASE}/clients`)) path = fallbackPath;
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}error=${encodeURIComponent(errorKey)}`);
}

async function requireSuperAdminHouseholdFromForm(formData: FormData): Promise<string> {
  await requireSuperAdmin();
  const householdId = (formData.get("household_id") as string | null)?.trim();
  if (!householdId) redirect(ADMIN_HOUSEHOLDS);
  return householdId;
}

/** Super admin (admin UI): household from form. Household users: current household from session (ignores form). */
async function householdIdForTherapyHouseholdScopedForms(formData: FormData): Promise<{
  householdId: string;
  isSuperAdminContext: boolean;
}> {
  const session = await getAuthSession();
  if (session?.user?.isSuperAdmin) {
    await requireSuperAdmin();
    const householdId = (formData.get("household_id") as string | null)?.trim();
    if (!householdId) redirect(ADMIN_HOUSEHOLDS);
    return { householdId, isSuperAdminContext: true };
  }
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  return { householdId, isSuperAdminContext: false };
}

function redirectAfterTherapyHouseholdScopedSave(
  isSuperAdminContext: boolean,
  householdId: string,
  query: string,
): never {
  if (isSuperAdminContext) {
    redirect(`${ADMIN_HOUSEHOLDS}/${householdId}/edit?${query}`);
  }
  redirect(`${BASE}/settings?${query}`);
}

async function householdIdOrRedirect(): Promise<string> {
  await requireHouseholdMember();
  const id = await getCurrentHouseholdId();
  if (!id) redirect("/");
  return id;
}

async function assertJob(householdId: string, jobId: string) {
  const j = await prisma.jobs.findFirst({
    where: { id: jobId, household_id: householdId, is_private_clinic: true },
    select: { id: true },
  });
  return j?.id ?? null;
}

async function assertJobForFamilyMember(householdId: string, familyMemberId: string, jobId: string) {
  const j = await prisma.jobs.findFirst({
    where: {
      id: jobId,
      household_id: householdId,
      family_member_id: familyMemberId,
      is_private_clinic: true,
    },
    select: { id: true },
  });
  return j?.id ?? null;
}

async function assertProgram(householdId: string, programId: string) {
  const p = await prisma.therapy_service_programs.findFirst({
    where: { id: programId, household_id: householdId },
    select: { id: true, job_id: true },
  });
  return p;
}

async function assertClient(householdId: string, clientId: string) {
  const c = await prisma.therapy_clients.findFirst({
    where: { id: clientId, household_id: householdId },
    select: { id: true },
  });
  return c?.id ?? null;
}

async function assertFamily(householdId: string, familyId: string) {
  const f = await prisma.therapy_families.findFirst({
    where: { id: familyId, household_id: householdId },
    select: { id: true },
  });
  return f?.id ?? null;
}

function parseMoney(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseLitres(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed.toFixed(3);
}

function parseDateRequired(raw: string | null | undefined): Date | null {
  const d = parseDate(raw);
  return d;
}

function parseVisitType(raw: string | null | undefined): TherapyVisitType | null {
  if (raw === "clinic" || raw === "home" || raw === "phone" || raw === "video") return raw;
  return null;
}

function parseTherapyClientRelationshipType(raw: string | null | undefined): TherapyClientRelationshipType | null {
  if (
    raw === "mother" ||
    raw === "father" ||
    raw === "husband" ||
    raw === "wife" ||
    raw === "referred_by"
  ) {
    return raw;
  }
  return null;
}

function parseRecipientType(raw: string | null | undefined): TherapyReceiptRecipientType | null {
  if (raw === "organization" || raw === "client") return raw;
  return null;
}

function parseReceiptPaymentMethod(raw: string | null | undefined): TherapyReceiptPaymentMethod | null {
  if (raw === "cash" || raw === "bank_transfer" || raw === "digital_card" || raw === "credit_card") {
    return raw;
  }
  return null;
}

function parseReceiptKind(raw: string | null | undefined): TherapyReceiptKind | null {
  if (raw === "regular" || raw === "salary_fictitious") return raw;
  return null;
}

function defaultReceiptKindFromEmploymentType(employmentType: string | null | undefined): TherapyReceiptKind {
  return employmentType === "employee" ? "salary_fictitious" : "regular";
}

async function resolveReceiptKindForJob(
  householdId: string,
  jobId: string,
  requestedKindRaw: string | null | undefined,
): Promise<TherapyReceiptKind | null> {
  const requestedKind = parseReceiptKind(requestedKindRaw);
  if (requestedKind) return requestedKind;
  const job = await prisma.jobs.findFirst({
    where: { id: jobId, household_id: householdId },
    select: { employment_type: true },
  });
  if (!job) return null;
  return defaultReceiptKindFromEmploymentType(job.employment_type);
}

function parseTreatmentPaymentMethod(raw: string | null | undefined): TherapyTreatmentPaymentMethod | null {
  if (raw === "bank_transfer" || raw === "digital_payment") return raw;
  return null;
}

async function resolveTherapyTreatmentPaymentFields(
  householdId: string,
  formData: FormData,
  forceClear = false,
): Promise<{
  payment_date: Date | null;
  payment_method: TherapyTreatmentPaymentMethod | null;
  payment_bank_account_id: string | null;
  payment_digital_payment_method_id: string | null;
}> {
  if (forceClear) {
    return {
      payment_date: null,
      payment_method: null,
      payment_bank_account_id: null,
      payment_digital_payment_method_id: null,
    };
  }
  const payment_date = parseDate((formData.get("payment_date") as string)?.trim() || null);
  const payment_method = parseTreatmentPaymentMethod((formData.get("payment_method") as string)?.trim() || null);

  let payment_bank_account_id: string | null = null;
  let payment_digital_payment_method_id: string | null = null;

  if (payment_method === "bank_transfer") {
    const bankRaw = (formData.get("payment_bank_account_id") as string)?.trim() || "";
    if (bankRaw) {
      const ba = await prisma.bank_accounts.findFirst({
        where: { id: bankRaw, household_id: householdId },
        select: { id: true },
      });
      payment_bank_account_id = ba?.id ?? null;
    }
  } else if (payment_method === "digital_payment") {
    const digRaw = (formData.get("payment_digital_payment_method_id") as string)?.trim() || "";
    if (digRaw) {
      const d = await prisma.digital_payment_methods.findFirst({
        where: { id: digRaw, household_id: householdId },
        select: { id: true },
      });
      payment_digital_payment_method_id = d?.id ?? null;
    }
  }

  return {
    payment_date,
    payment_method,
    payment_bank_account_id,
    payment_digital_payment_method_id,
  };
}

function isOrganizationPaidPrivateClinicJob(job: {
  is_private_clinic: boolean;
  external_reporting_system: string | null;
}): boolean {
  return job.is_private_clinic && Boolean(job.external_reporting_system);
}

function parseAppointmentStatus(raw: string | null | undefined): TherapyAppointmentStatus | null {
  if (raw === "scheduled" || raw === "cancelled" || raw === "completed") return raw;
  return null;
}

function parseSeriesRecurrence(raw: string | null | undefined): TherapyAppointmentRecurrence | null {
  if (raw === "weekly" || raw === "biweekly") return raw;
  return null;
}

function parseBillingBasis(raw: string | null | undefined): TherapyBillingBasis | null {
  if (raw === "per_treatment" || raw === "per_month") return raw;
  return null;
}

function parseBillingTiming(raw: string | null | undefined): TherapyBillingTiming | null {
  if (raw === "in_advance" || raw === "in_arrears") return raw;
  return null;
}

async function assertFamilyTherapyEnabled(householdId: string): Promise<void> {
  const settings = await prisma.therapy_settings.findUnique({
    where: { household_id: householdId },
    select: { family_therapy_enabled: true },
  });
  if (!settings?.family_therapy_enabled) {
    redirect(`${BASE}`);
  }
}

type EmploymentType = "freelancer" | "employee" | "self_employed" | "contractor_via_company";

function parseEmploymentType(raw: string | null | undefined): EmploymentType | null {
  if (
    raw === "freelancer" ||
    raw === "employee" ||
    raw === "self_employed" ||
    raw === "contractor_via_company"
  ) {
    return raw;
  }
  return null;
}

async function getCurrentUserFamilyMemberId(householdId: string): Promise<string | null> {
  const session = await requireHouseholdMember();
  const userId = session.user.id;
  if (!userId) return null;
  const user = await prisma.users.findFirst({
    where: { id: userId, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  return user?.family_member_id ?? null;
}

async function validateFamilyMemberInHousehold(householdId: string, familyMemberId: string): Promise<boolean> {
  const m = await prisma.family_members.findFirst({
    where: { id: familyMemberId, household_id: householdId, is_active: true },
    select: { id: true },
  });
  return !!m;
}

/** Job create: use linked member, or `family_member_id` from form when user is not linked. */
async function resolveFamilyMemberIdForJobCreate(
  householdId: string,
  formData: FormData,
): Promise<{ ok: true; family_member_id: string } | { ok: false; code: "family" | "member" }> {
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  if (userFm) return { ok: true, family_member_id: userFm };
  const raw = (formData.get("family_member_id") as string | null)?.trim() || "";
  if (!raw) return { ok: false, code: "family" };
  if (!(await validateFamilyMemberInHousehold(householdId, raw))) return { ok: false, code: "member" };
  return { ok: true, family_member_id: raw };
}

async function assertJobForCurrentUserScope(
  householdId: string,
  userFamilyMemberId: string | null,
  jobId: string,
): Promise<boolean> {
  if (userFamilyMemberId) {
    return !!(await assertJobForFamilyMember(householdId, userFamilyMemberId, jobId));
  }
  return !!(await assertJob(householdId, jobId));
}

async function assertClientForCurrentUserScope(
  householdId: string,
  userFamilyMemberId: string | null,
  clientId: string,
): Promise<boolean> {
  if (!userFamilyMemberId) {
    return !!(await assertClient(householdId, clientId));
  }
  const c = await prisma.therapy_clients.findFirst({
    where: {
      id: clientId,
      household_id: householdId,
      OR: [
        { default_job: { family_member_id: userFamilyMemberId, is_private_clinic: true } },
        {
          client_jobs: {
            some: { job: { family_member_id: userFamilyMemberId, is_private_clinic: true } },
          },
        },
      ],
    },
    select: { id: true },
  });
  return !!c;
}

async function hasAssociatedTreatmentsForClients(householdId: string, clientIds: string[]): Promise<boolean> {
  if (clientIds.length === 0) return false;
  const [primaryCount, participantCount] = await Promise.all([
    prisma.therapy_treatments.count({
      where: { household_id: householdId, client_id: { in: clientIds } },
    }),
    prisma.therapy_treatment_participants.count({
      where: { household_id: householdId, client_id: { in: clientIds } },
    }),
  ]);
  return primaryCount > 0 || participantCount > 0;
}

/** Client on a receipt must be active, unless re-saving the same inactive client on update. */
async function assertReceiptClientPicker(
  householdId: string,
  userFamilyMemberId: string | null,
  clientId: string,
  priorClientId: string | null | undefined,
): Promise<string | null> {
  if (!(await assertClientForCurrentUserScope(householdId, userFamilyMemberId, clientId))) return null;
  const row = await prisma.therapy_clients.findFirst({
    where: {
      id: clientId,
      household_id: householdId,
      OR: [{ is_active: true }, ...(priorClientId === clientId ? [{ id: clientId }] : [])],
    },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function jobIdsForCurrentUserScope(householdId: string, userFamilyMemberId: string | null): Promise<Set<string>> {
  const rows = await prisma.jobs.findMany({
    where: {
      household_id: householdId,
      is_private_clinic: true,
      ...(userFamilyMemberId ? { family_member_id: userFamilyMemberId } : {}),
    },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

async function validateCarInHousehold(householdId: string, carId: string): Promise<boolean> {
  const car = await prisma.cars.findFirst({
    where: { id: carId, household_id: householdId },
    select: { id: true },
  });
  return !!car;
}

async function countEligiblePetrolTankers(householdId: string, filledAt: Date): Promise<number> {
  const members = await prisma.family_members.findMany({
    where: { household_id: householdId, is_active: true, date_of_birth: { not: null } },
    select: { date_of_birth: true },
  });
  return members.filter((m) => isEligiblePetrolTankerOnFillDate(m.date_of_birth!, filledAt)).length;
}

async function resolveTankedUpByFamilyMemberId(
  householdId: string,
  raw: string | null | undefined,
  filledAt: Date,
  eligibleTankerCount: number,
): Promise<{ id: string | null; error: string | null }> {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) {
    if (eligibleTankerCount > 0) return { id: null, error: "Choose who tanked up." };
    return { id: null, error: null };
  }
  const member = await prisma.family_members.findFirst({
    where: { id: trimmed, household_id: householdId, is_active: true },
    select: { id: true, date_of_birth: true },
  });
  if (!member) return { id: null, error: "Invalid family member." };
  if (!member.date_of_birth || !isEligiblePetrolTankerOnFillDate(member.date_of_birth, filledAt)) {
    return { id: null, error: "Choose a family member who is 16 or older on the fill date." };
  }
  return { id: member.id, error: null };
}

// --- Settings ---

function trimOptionalNoteHe(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  return t ? t : null;
}

/** Household users: treatment note labels only (English + optional Hebrew). Tab visibility is super-admin only. */
export async function updateTherapyNoteLabelsFromDashboard(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  await ensureTherapySettings(householdId);

  const note_1_label = (formData.get("note_1_label") as string | null)?.trim() ?? "";
  const note_2_label = (formData.get("note_2_label") as string | null)?.trim() ?? "";
  const note_3_label = (formData.get("note_3_label") as string | null)?.trim() ?? "";
  const note_1_visible = formData.get("note_1_visible") === "on";
  const note_2_visible = formData.get("note_2_visible") === "on";
  const note_3_visible = formData.get("note_3_visible") === "on";
  const note_1_label_he = trimOptionalNoteHe(formData.get("note_1_label_he") as string | null);
  const note_2_label_he = trimOptionalNoteHe(formData.get("note_2_label_he") as string | null);
  const note_3_label_he = trimOptionalNoteHe(formData.get("note_3_label_he") as string | null);

  await prisma.therapy_settings.update({
    where: { household_id: householdId },
    data: {
      note_1_label,
      note_2_label,
      note_3_label,
      note_1_visible,
      note_2_visible,
      note_3_visible,
      note_1_label_he,
      note_2_label_he,
      note_3_label_he,
    },
  });

  revalidatePath(BASE, "layout");
  revalidatePath(`${BASE}/settings`);
  revalidatePath(`${BASE}/treatments`);
  redirect(`${BASE}/settings?saved=1`);
}

export async function updateTherapySettings(formData: FormData) {
  const householdId = await requireSuperAdminHouseholdFromForm(formData);
  await ensureTherapySettings(householdId);

  const note_1_label = (formData.get("note_1_label") as string | null)?.trim() ?? "";
  const note_2_label = (formData.get("note_2_label") as string | null)?.trim() ?? "";
  const note_3_label = (formData.get("note_3_label") as string | null)?.trim() ?? "";
  const note_1_visible = formData.get("note_1_visible") === "on";
  const note_2_visible = formData.get("note_2_visible") === "on";
  const note_3_visible = formData.get("note_3_visible") === "on";
  const note_1_label_he = trimOptionalNoteHe(formData.get("note_1_label_he") as string | null);
  const note_2_label_he = trimOptionalNoteHe(formData.get("note_2_label_he") as string | null);
  const note_3_label_he = trimOptionalNoteHe(formData.get("note_3_label_he") as string | null);

  await prisma.therapy_settings.update({
    where: { household_id: householdId },
    data: {
      note_1_label,
      note_2_label,
      note_3_label,
      note_1_visible,
      note_2_visible,
      note_3_visible,
      note_1_label_he,
      note_2_label_he,
      note_3_label_he,
    },
  });

  revalidatePath(BASE, "layout");
  revalidatePath(`${ADMIN_HOUSEHOLDS}/${householdId}/edit`);
  redirect(`${ADMIN_HOUSEHOLDS}/${householdId}/edit?saved=1`);
}

export async function updateTherapyNavTabs(formData: FormData) {
  const householdId = await requireSuperAdminHouseholdFromForm(formData);
  await ensureTherapySettings(householdId);

  const nav: Record<string, boolean> = {};
  for (const item of PRIVATE_CLINIC_NAV_ITEMS) {
    nav[item.key] = formData.get(`nav_${item.key}`) === "on";
  }

  await prisma.therapy_settings.update({
    where: { household_id: householdId },
    data: { nav_tabs_json: nav },
  });

  revalidatePath(BASE, "layout");
  revalidatePath(`${ADMIN_HOUSEHOLDS}/${householdId}/edit`);
  redirect(`${ADMIN_HOUSEHOLDS}/${householdId}/edit?saved=nav`);
}

// --- Jobs ---

export async function createTherapyJob(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const resolvedFm = await resolveFamilyMemberIdForJobCreate(householdId, formData);
  if (!resolvedFm.ok) {
    redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, resolvedFm.code);
  }
  const { family_member_id } = resolvedFm;

  const employment_type = parseEmploymentType((formData.get("employment_type") as string)?.trim() || null);
  const start_date_raw = (formData.get("start_date") as string)?.trim() || "";
  const end_date_raw = (formData.get("end_date") as string)?.trim() || "";
  const job_title = (formData.get("job_title") as string)?.trim() || "";

  if (!employment_type || !start_date_raw || !job_title) {
    redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "missing");
  }
  const start_date = parseDate(start_date_raw);
  const end_date = parseDate(end_date_raw || null);
  if (!start_date) redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "start");
  if (end_date_raw && !end_date) redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "end");
  if (end_date && end_date < start_date) redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "range");

  await prisma.jobs.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      family_member_id,
      employment_type,
      start_date,
      end_date,
      job_title,
      employer_name: (formData.get("employer_name") as string)?.trim() || null,
      external_reporting_system: (formData.get("external_reporting_system") as string)?.trim() || null,
      employer_tax_number: (formData.get("employer_tax_number") as string)?.trim() || null,
      employer_address: (formData.get("employer_address") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
      is_active: formData.has("is_active"),
      is_private_clinic: formData.has("is_private_clinic"),
    },
  });

  revalidatePath(`${BASE}/jobs`);
  revalidatePath(`${BASE}/programs`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/jobs?created=1`);
}

export async function updateTherapyJob(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);

  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "id");

  const row = await prisma.jobs.findFirst({
    where: userFm
      ? { id, household_id: householdId, family_member_id: userFm }
      : { id, household_id: householdId },
    select: { id: true },
  });
  if (!row) redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "notfound");

  const employment_type = parseEmploymentType((formData.get("employment_type") as string)?.trim() || null);
  const start_date_raw = (formData.get("start_date") as string)?.trim() || "";
  const end_date_raw = (formData.get("end_date") as string)?.trim() || "";
  const job_title = (formData.get("job_title") as string)?.trim() || "";

  if (!employment_type || !start_date_raw || !job_title) {
    redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "missing");
  }
  const start_date = parseDate(start_date_raw);
  const end_date = parseDate(end_date_raw || null);
  if (!start_date) redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "start");
  if (end_date_raw && !end_date) redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "end");
  if (end_date && end_date < start_date) redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "range");

  await prisma.jobs.update({
    where: { id },
    data: {
      employment_type,
      start_date,
      end_date,
      job_title,
      employer_name: (formData.get("employer_name") as string)?.trim() || null,
      external_reporting_system: (formData.get("external_reporting_system") as string)?.trim() || null,
      employer_tax_number: (formData.get("employer_tax_number") as string)?.trim() || null,
      employer_address: (formData.get("employer_address") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
      is_active: formData.has("is_active"),
      is_private_clinic: formData.has("is_private_clinic"),
    },
  });

  revalidatePath(`${BASE}/jobs`);
  revalidatePath(`${BASE}/programs`);
  revalidatePath(`${BASE}/jobs/${id}/edit`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/jobs?updated=1`);
}

// --- Petrol ---

export async function createPrivateClinicPetrolFillup(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const car_id = (formData.get("car_id") as string | null)?.trim() || "";
  const filled_at = parseDate((formData.get("filled_at") as string | null)?.trim() || null);
  const amount_paid = parseMoney((formData.get("amount_paid") as string | null) ?? null);
  const litres = parseLitres((formData.get("litres") as string | null) ?? null);
  const odometerRaw = (formData.get("odometer_km") as string | null)?.trim();
  const odometer_km = odometerRaw ? Math.trunc(Number(odometerRaw)) : NaN;

  if (!car_id || !filled_at || !amount_paid || !litres || !Number.isFinite(odometer_km) || odometer_km < 0) {
    redirect(`${BASE}/petrol?${car_id ? `carId=${encodeURIComponent(car_id)}&` : ""}error=${encodeURIComponent("Date, amount, litres, and odometer are required.")}`);
  }
  if (!(await validateCarInHousehold(householdId, car_id))) {
    redirect(`${BASE}/petrol?carId=${encodeURIComponent(car_id)}&error=${encodeURIComponent("Invalid car")}`);
  }

  const eligibleTankers = await countEligiblePetrolTankers(householdId, filled_at);
  const tankedUp = await resolveTankedUpByFamilyMemberId(
    householdId,
    formData.get("tanked_up_by_family_member_id") as string,
    filled_at,
    eligibleTankers,
  );
  if (tankedUp.error) {
    redirect(`${BASE}/petrol?carId=${encodeURIComponent(car_id)}&error=${encodeURIComponent(tankedUp.error)}`);
  }

  const linked_transaction_id = await resolveTransactionLink(householdId, formData.get("linked_transaction_id") as string);
  if (linked_transaction_id) {
    const taken = await prisma.car_petrol_fillups.findFirst({
      where: { transaction_id: linked_transaction_id },
      select: { id: true },
    });
    if (taken) {
      redirect(`${BASE}/petrol?carId=${encodeURIComponent(car_id)}&error=${encodeURIComponent("That transaction is already linked to another petrol record.")}`);
    }
  }

  await prisma.car_petrol_fillups.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      car_id,
      filled_at,
      amount_paid,
      currency: (formData.get("currency") as string | null)?.trim() || "ILS",
      litres,
      odometer_km,
      transaction_id: linked_transaction_id,
      tanked_up_by_family_member_id: tankedUp.id,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`${BASE}/petrol`);
  revalidatePath("/dashboard/petrol-fillups");
  revalidatePath(`/dashboard/cars/${car_id}`);
  redirect(`${BASE}/petrol?carId=${encodeURIComponent(car_id)}&saved=1`);
}

export async function updatePrivateClinicPetrolFillup(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const id = (formData.get("id") as string | null)?.trim() || "";
  const car_id = (formData.get("car_id") as string | null)?.trim() || "";
  const filled_at = parseDate((formData.get("filled_at") as string | null)?.trim() || null);
  const amount_paid = parseMoney((formData.get("amount_paid") as string | null) ?? null);
  const litres = parseLitres((formData.get("litres") as string | null) ?? null);
  const odometerRaw = (formData.get("odometer_km") as string | null)?.trim();
  const odometer_km = odometerRaw ? Math.trunc(Number(odometerRaw)) : NaN;

  if (!id || !car_id || !filled_at || !amount_paid || !litres || !Number.isFinite(odometer_km) || odometer_km < 0) {
    redirect(`${BASE}/petrol?${car_id ? `carId=${encodeURIComponent(car_id)}&` : ""}error=${encodeURIComponent("Date, amount, litres, and odometer are required.")}`);
  }

  const existing = await prisma.car_petrol_fillups.findFirst({
    where: { id, household_id: householdId, car_id },
    select: { id: true },
  });
  if (!existing) {
    redirect(`${BASE}/petrol?carId=${encodeURIComponent(car_id)}&error=${encodeURIComponent("Fill-up not found.")}`);
  }

  const eligibleTankers = await countEligiblePetrolTankers(householdId, filled_at);
  const tankedUp = await resolveTankedUpByFamilyMemberId(
    householdId,
    formData.get("tanked_up_by_family_member_id") as string,
    filled_at,
    eligibleTankers,
  );
  if (tankedUp.error) {
    redirect(`${BASE}/petrol?carId=${encodeURIComponent(car_id)}&edit=${encodeURIComponent(id)}&error=${encodeURIComponent(tankedUp.error)}`);
  }

  const linked_transaction_id = await resolveTransactionLink(householdId, formData.get("linked_transaction_id") as string);
  if (linked_transaction_id) {
    const taken = await prisma.car_petrol_fillups.findFirst({
      where: { transaction_id: linked_transaction_id, id: { not: id } },
      select: { id: true },
    });
    if (taken) {
      redirect(`${BASE}/petrol?carId=${encodeURIComponent(car_id)}&edit=${encodeURIComponent(id)}&error=${encodeURIComponent("That transaction is already linked to another petrol record.")}`);
    }
  }

  await prisma.car_petrol_fillups.update({
    where: { id },
    data: {
      filled_at,
      amount_paid,
      currency: (formData.get("currency") as string | null)?.trim() || "ILS",
      litres,
      odometer_km,
      transaction_id: linked_transaction_id,
      tanked_up_by_family_member_id: tankedUp.id,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`${BASE}/petrol`);
  revalidatePath("/dashboard/petrol-fillups");
  revalidatePath(`/dashboard/cars/${car_id}`);
  redirect(`${BASE}/petrol?carId=${encodeURIComponent(car_id)}&saved=1`);
}

export async function deletePrivateClinicPetrolFillup(id: string, carId: string) {
  const householdId = await householdIdOrRedirect();
  await prisma.car_petrol_fillups.deleteMany({
    where: { id, car_id: carId, household_id: householdId },
  });
  revalidatePath(`${BASE}/petrol`);
  revalidatePath("/dashboard/petrol-fillups");
  revalidatePath(`/dashboard/cars/${carId}`);
  redirect(`${BASE}/petrol?carId=${encodeURIComponent(carId)}&deleted=1`);
}

// --- Programs ---

export async function createTherapyProgram(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const fallbackSuccess = `${BASE}/programs?created=1`;
  const fallbackError = `${BASE}/programs`;
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const name = (formData.get("name") as string)?.trim() || "";
  if (!job_id || !name) redirectPrivateClinicScoped(formData, "error", fallbackError, "missing");
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "job");
  }

  const visits_per_period_count = parseVisitCount(formData.get("visits_per_period_count") as string | null);
  const visits_per_period_weeks = parseVisitWeeks(formData.get("visits_per_period_weeks") as string | null);

  await prisma.therapy_service_programs.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      job_id,
      name,
      description: (formData.get("description") as string)?.trim() || null,
      sort_order: Number(formData.get("sort_order") || 0) || 0,
      is_active: formData.has("is_active"),
      visits_per_period_count,
      visits_per_period_weeks,
    },
  });

  revalidatePath(`${BASE}/programs`);
  redirectPrivateClinicScoped(formData, "success", fallbackSuccess);
}

export async function updateTherapyProgram(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  const fallbackError = `${BASE}/programs`;
  if (!id) redirectPrivateClinicScoped(formData, "error", fallbackError, "id");
  const row = await prisma.therapy_service_programs.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirectPrivateClinicScoped(formData, "error", fallbackError, "notfound");
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "job");
  }

  const visits_per_period_count = parseVisitCount(formData.get("visits_per_period_count") as string | null);
  const visits_per_period_weeks = parseVisitWeeks(formData.get("visits_per_period_weeks") as string | null);

  await prisma.therapy_service_programs.update({
    where: { id },
    data: {
      name: (formData.get("name") as string)?.trim() || row.name,
      description: (formData.get("description") as string)?.trim() || null,
      sort_order: Number(formData.get("sort_order") || row.sort_order) || 0,
      is_active: formData.has("is_active"),
      visits_per_period_count,
      visits_per_period_weeks,
    },
  });

  revalidatePath(`${BASE}/programs`);
  revalidatePath(`${BASE}/programs/${id}/edit`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/programs/${id}/edit?updated=1`);
}

export async function deleteTherapyProgram(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  const fallbackSuccess = `${BASE}/programs?updated=1`;
  const fallbackError = `${BASE}/programs`;
  if (!id) redirectPrivateClinicScoped(formData, "error", fallbackError, "id");
  const row = await prisma.therapy_service_programs.findFirst({
    where: { id, household_id: householdId },
    select: { job_id: true },
  });
  if (!row) redirectPrivateClinicScoped(formData, "error", fallbackError, "notfound");
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "job");
  }
  revalidatePath(`${BASE}/programs/${id}/edit`);
  await prisma.therapy_service_programs.deleteMany({
    where: { id, household_id: householdId },
  });
  revalidatePath(`${BASE}/programs`);
  redirectPrivateClinicScoped(formData, "success", fallbackSuccess);
}

const THERAPY_VISIT_TYPES: TherapyVisitType[] = ["clinic", "home", "phone", "video"];

export async function saveTherapyJobVisitTypeDefaults(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  if (!job_id) redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "missing");
  if (!(await assertJobForCurrentUserScope(householdId, userFamilyMemberId, job_id))) {
    redirectPrivateClinicScoped(formData, "error", `${BASE}/jobs`, "job");
  }

  for (const vt of THERAPY_VISIT_TYPES) {
    const amountStr = parseMoney(formData.get(`amount_${vt}`) as string);
    const currencyRaw = (formData.get(`currency_${vt}`) as string)?.trim() || "ILS";
    const currency = currencyRaw.slice(0, 12) || "ILS";

    const existing = await prisma.therapy_visit_type_default_amounts.findFirst({
      where: {
        household_id: householdId,
        job_id,
        program_id: null,
        visit_type: vt,
      },
    });

    if (!amountStr) {
      if (existing) {
        await prisma.therapy_visit_type_default_amounts.delete({ where: { id: existing.id } });
      }
    } else if (existing) {
      await prisma.therapy_visit_type_default_amounts.update({
        where: { id: existing.id },
        data: { amount: amountStr, currency },
      });
    } else {
      await prisma.therapy_visit_type_default_amounts.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          job_id,
          program_id: null,
          visit_type: vt,
          amount: amountStr,
          currency,
        },
      });
    }
  }

  revalidatePath(`${BASE}/jobs`);
  revalidatePath(`${BASE}/jobs/${job_id}/edit`);
  revalidatePath(`${BASE}/treatments`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/jobs?updated=1`);
}

export async function saveTherapyProgramVisitTypeDefaults(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const program_id = (formData.get("program_id") as string)?.trim() || "";
  const fallbackError = `${BASE}/programs`;
  if (!program_id) redirectPrivateClinicScoped(formData, "error", fallbackError, "missing");

  const prog = await assertProgram(householdId, program_id);
  if (!prog) redirectPrivateClinicScoped(formData, "error", fallbackError, "notfound");
  if (!(await assertJobForCurrentUserScope(householdId, userFamilyMemberId, prog.job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "job");
  }

  const job_id = prog.job_id;

  for (const vt of THERAPY_VISIT_TYPES) {
    const amountStr = parseMoney(formData.get(`amount_${vt}`) as string);
    const currencyRaw = (formData.get(`currency_${vt}`) as string)?.trim() || "ILS";
    const currency = currencyRaw.slice(0, 12) || "ILS";

    const existing = await prisma.therapy_visit_type_default_amounts.findFirst({
      where: {
        household_id: householdId,
        program_id,
        visit_type: vt,
      },
    });

    if (!amountStr) {
      if (existing) {
        await prisma.therapy_visit_type_default_amounts.delete({ where: { id: existing.id } });
      }
    } else if (existing) {
      await prisma.therapy_visit_type_default_amounts.update({
        where: { id: existing.id },
        data: { amount: amountStr, currency, job_id },
      });
    } else {
      await prisma.therapy_visit_type_default_amounts.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          job_id,
          program_id,
          visit_type: vt,
          amount: amountStr,
          currency,
        },
      });
    }
  }

  revalidatePath(`${BASE}/programs`);
  revalidatePath(`${BASE}/programs/${program_id}/edit`);
  revalidatePath(`${BASE}/treatments`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/programs/${program_id}/edit?updated=1`);
}

// --- Clients ---

export async function createTherapyClient(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const fallbackErrorPath = `${BASE}/clients/new`;
  const first_name = (formData.get("first_name") as string)?.trim() || "";
  const default_job_id = (formData.get("default_job_id") as string)?.trim() || "";
  const family_id_raw = (formData.get("family_id") as string)?.trim() || "";
  const default_program_id_raw = (formData.get("default_program_id") as string)?.trim() || "";
  const default_visit_type_raw = (formData.get("default_visit_type") as string)?.trim() || "";
  if (!first_name || !default_job_id) {
    redirectTherapyClientFormError(formData, fallbackErrorPath, "missing");
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFamilyMemberId, default_job_id))) {
    redirectTherapyClientFormError(formData, fallbackErrorPath, "job");
  }
  let default_program_id: string | null = null;
  if (default_program_id_raw) {
    const prog = await assertProgram(householdId, default_program_id_raw);
    if (!prog || prog.job_id !== default_job_id) {
      redirectTherapyClientFormError(formData, fallbackErrorPath, "program");
    }
    default_program_id = prog.id;
  }
  const default_visit_type = default_visit_type_raw ? parseVisitType(default_visit_type_raw) : null;
  if (default_visit_type_raw && !default_visit_type) {
    redirectTherapyClientFormError(formData, fallbackErrorPath, "visit-type");
  }

  const family_id = family_id_raw ? await assertFamily(householdId, family_id_raw) : null;
  const billing_basis = parseBillingBasis((formData.get("billing_basis") as string | null) ?? null);
  const billing_timing = parseBillingTiming((formData.get("billing_timing") as string | null) ?? null);

  const jobIdsRaw = formData.getAll("job_ids") as string[];
  const jobIds = [...new Set(jobIdsRaw.map((s) => String(s).trim()).filter(Boolean))];
  if (!jobIds.includes(default_job_id)) jobIds.push(default_job_id);
  const allowedJobIds = await jobIdsForCurrentUserScope(householdId, userFamilyMemberId);

  const id = crypto.randomUUID();
  const mobile = (formData.get("mobile_phone") as string)?.trim() || "";
  const home = (formData.get("home_phone") as string)?.trim() || "";
  const phones = [mobile, home].filter(Boolean).join("\n") || null;
  let visits_per_period_count = parseVisitCount(formData.get("visits_per_period_count") as string | null);
  let visits_per_period_weeks = parseVisitWeeks(formData.get("visits_per_period_weeks") as string | null);
  if (default_program_id) {
    const prog = await prisma.therapy_service_programs.findFirst({
      where: { id: default_program_id, household_id: householdId },
      select: { visits_per_period_count: true, visits_per_period_weeks: true },
    });
    if (prog) {
      if (visits_per_period_count === null && prog.visits_per_period_count != null) {
        visits_per_period_count = prog.visits_per_period_count;
      }
      if (visits_per_period_weeks === null && prog.visits_per_period_weeks != null) {
        visits_per_period_weeks = prog.visits_per_period_weeks;
      }
    }
  }
  if (visits_per_period_count === null) visits_per_period_count = 1;
  if (visits_per_period_weeks === null) visits_per_period_weeks = 1;
  const disability_status_raw = (formData.get("disability_status") as string)?.trim() || "";
  const rehab_basket_status_raw = (formData.get("rehab_basket_status") as string)?.trim() || "";
  const disability_status = CLIENT_STATUS_OPTIONS.has(disability_status_raw) ? disability_status_raw : null;
  const rehab_basket_status = CLIENT_STATUS_OPTIONS.has(rehab_basket_status_raw) ? rehab_basket_status_raw : null;

  await prisma.$transaction(async (tx) => {
    await tx.therapy_clients.create({
      data: {
        id,
        household_id: householdId,
        first_name,
        last_name: (formData.get("last_name") as string)?.trim() || null,
        id_number: (formData.get("id_number") as string)?.trim() || null,
        start_date: parseDate((formData.get("start_date") as string) || null),
        end_date: parseDate((formData.get("end_date") as string) || null),
        notes: (formData.get("notes") as string)?.trim() || null,
        default_job_id,
        default_program_id,
        default_visit_type,
        family_id,
        billing_basis,
        billing_timing,
        email: (formData.get("email") as string)?.trim() || null,
        phones,
        address: (formData.get("address") as string)?.trim() || null,
        visits_per_period_count,
        visits_per_period_weeks,
        disability_status,
        rehab_basket_status,
      },
    });

    for (const jid of jobIds) {
      if (!allowedJobIds.has(jid)) continue;
      await tx.therapy_clients_jobs.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          client_id: id,
          job_id: jid,
          is_primary: jid === default_job_id,
        },
      });
    }
  });

  revalidatePath(`${BASE}/clients`);
  revalidatePath(`${BASE}/clients/new`);
  revalidatePath(`${BASE}/reminders`);
  redirect(`${BASE}/clients?created=1`);
}

export async function updateTherapyClient(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  if (!(await assertClientForCurrentUserScope(householdId, userFamilyMemberId, id))) {
    redirectTherapyClientFormError(formData, `${BASE}/clients`, "notfound");
  }

  const default_job_id = (formData.get("default_job_id") as string)?.trim() || "";
  const family_id_raw = (formData.get("family_id") as string)?.trim() || "";
  const default_program_id_raw = (formData.get("default_program_id") as string)?.trim() || "";
  const default_visit_type_raw = (formData.get("default_visit_type") as string)?.trim() || "";
  if (!default_job_id) {
    redirectTherapyClientFormError(formData, `${BASE}/clients/${id}/edit`, "missing");
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFamilyMemberId, default_job_id))) {
    redirectTherapyClientFormError(formData, `${BASE}/clients/${id}/edit`, "job");
  }
  let default_program_id: string | null = null;
  if (default_program_id_raw) {
    const prog = await assertProgram(householdId, default_program_id_raw);
    if (!prog || prog.job_id !== default_job_id) {
      redirectTherapyClientFormError(formData, `${BASE}/clients/${id}/edit`, "program");
    }
    default_program_id = prog.id;
  }
  const default_visit_type = default_visit_type_raw ? parseVisitType(default_visit_type_raw) : null;
  if (default_visit_type_raw && !default_visit_type) {
    redirectTherapyClientFormError(formData, `${BASE}/clients/${id}/edit`, "visit-type");
  }

  const family_id = family_id_raw ? await assertFamily(householdId, family_id_raw) : null;
  const billing_basis = parseBillingBasis((formData.get("billing_basis") as string | null) ?? null);
  const billing_timing = parseBillingTiming((formData.get("billing_timing") as string | null) ?? null);

  const jobIdsRaw = formData.getAll("job_ids") as string[];
  const jobIds = [...new Set(jobIdsRaw.map((s) => String(s).trim()).filter(Boolean))];
  if (!jobIds.includes(default_job_id)) jobIds.push(default_job_id);
  const allowedJobIds = await jobIdsForCurrentUserScope(householdId, userFamilyMemberId);
  const mobile = (formData.get("mobile_phone") as string)?.trim() || "";
  const home = (formData.get("home_phone") as string)?.trim() || "";
  const phones = [mobile, home].filter(Boolean).join("\n") || null;
  const visits_per_period_count = parseVisitCount(formData.get("visits_per_period_count") as string | null);
  const visits_per_period_weeks = parseVisitWeeks(formData.get("visits_per_period_weeks") as string | null);
  const disability_status_raw = (formData.get("disability_status") as string)?.trim() || "";
  const rehab_basket_status_raw = (formData.get("rehab_basket_status") as string)?.trim() || "";
  const disability_status = CLIENT_STATUS_OPTIONS.has(disability_status_raw) ? disability_status_raw : null;
  const rehab_basket_status = CLIENT_STATUS_OPTIONS.has(rehab_basket_status_raw) ? rehab_basket_status_raw : null;

  await prisma.$transaction(async (tx) => {
    await tx.therapy_clients.update({
      where: { id },
      data: {
        first_name: (formData.get("first_name") as string)?.trim() || "",
        last_name: (formData.get("last_name") as string)?.trim() || null,
        id_number: (formData.get("id_number") as string)?.trim() || null,
        start_date: parseDate((formData.get("start_date") as string) || null),
        end_date: parseDate((formData.get("end_date") as string) || null),
        notes: (formData.get("notes") as string)?.trim() || null,
        default_job_id,
        default_program_id,
        default_visit_type,
        family_id,
        billing_basis,
        billing_timing,
        email: (formData.get("email") as string)?.trim() || null,
        phones,
        address: (formData.get("address") as string)?.trim() || null,
        visits_per_period_count,
        visits_per_period_weeks,
        disability_status,
        rehab_basket_status,
        is_active: formData.has("is_active"),
      },
    });

    await tx.therapy_clients_jobs.deleteMany({ where: { client_id: id, household_id: householdId } });
    for (const jid of jobIds) {
      if (!allowedJobIds.has(jid)) continue;
      await tx.therapy_clients_jobs.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          client_id: id,
          job_id: jid,
          is_primary: jid === default_job_id,
        },
      });
    }
  });

  revalidatePath(`${BASE}/clients`);
  revalidatePath(`${BASE}/clients/${id}/edit`);
  revalidatePath(`${BASE}/reminders`);
  redirect(`${BASE}/clients?updated=1`);
}

export async function deleteTherapyClient(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string | null)?.trim() || "";
  if (!id) redirect(`${BASE}/clients?error=missing`);
  if (!(await assertClientForCurrentUserScope(householdId, userFamilyMemberId, id))) {
    redirect(`${BASE}/clients?error=notfound`);
  }
  if (await hasAssociatedTreatmentsForClients(householdId, [id])) {
    redirectTherapyClientFormError(formData, `${BASE}/clients/${id}/edit`, "has-treatments");
  }

  await prisma.therapy_clients.delete({
    where: { id },
  });

  revalidatePath(`${BASE}/clients`);
  revalidatePath(`${BASE}/families`);
  revalidatePath(`${BASE}/treatments`);
  revalidatePath(`${BASE}/receipts`);
  redirect(`${BASE}/clients?updated=1`);
}

export async function addTherapyClientRelationship(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const from_client_id = (formData.get("from_client_id") as string)?.trim() || "";
  const to_client_id = (formData.get("to_client_id") as string)?.trim() || "";
  const relRaw = (formData.get("relationship") as string)?.trim() || "";
  const fallbackEdit = from_client_id ? `${BASE}/clients/${from_client_id}/edit` : `${BASE}/clients`;

  if (!from_client_id || !to_client_id || !relRaw) {
    redirectTherapyClientFormError(formData, fallbackEdit, "rel-missing");
  }
  if (from_client_id === to_client_id) {
    redirectTherapyClientFormError(formData, `${BASE}/clients/${from_client_id}/edit`, "rel-self");
  }
  const relationship = parseTherapyClientRelationshipType(relRaw);
  if (!relationship) {
    redirectTherapyClientFormError(formData, `${BASE}/clients/${from_client_id}/edit`, "rel-type");
  }
  if (!(await assertClientForCurrentUserScope(householdId, userFamilyMemberId, from_client_id))) {
    redirectTherapyClientFormError(formData, `${BASE}/clients`, "notfound");
  }
  if (!(await assertClientForCurrentUserScope(householdId, userFamilyMemberId, to_client_id))) {
    redirectTherapyClientFormError(formData, `${BASE}/clients/${from_client_id}/edit`, "rel-client");
  }

  try {
    await prisma.therapy_client_relationships.create({
      data: {
        id: crypto.randomUUID(),
        household_id: householdId,
        from_client_id,
        to_client_id,
        relationship,
      },
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      redirectTherapyClientFormError(formData, `${BASE}/clients/${from_client_id}/edit`, "rel-duplicate");
    }
    throw e;
  }

  revalidatePath(`${BASE}/clients`);
  revalidatePath(`${BASE}/clients/${from_client_id}/edit`);
  redirect(`${BASE}/clients/${from_client_id}/edit?updated=1`);
}

export async function removeTherapyClientRelationship(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  const from_client_id = (formData.get("from_client_id") as string)?.trim() || "";
  if (!id || !from_client_id) {
    redirectTherapyClientFormError(formData, `${BASE}/clients`, "rel-missing");
  }
  if (!(await assertClientForCurrentUserScope(householdId, userFamilyMemberId, from_client_id))) {
    redirectTherapyClientFormError(formData, `${BASE}/clients`, "notfound");
  }
  const row = await prisma.therapy_client_relationships.findFirst({
    where: { id, household_id: householdId, from_client_id },
    select: { id: true },
  });
  if (!row) {
    redirectTherapyClientFormError(formData, `${BASE}/clients/${from_client_id}/edit`, "rel-notfound");
  }
  await prisma.therapy_client_relationships.delete({ where: { id } });
  revalidatePath(`${BASE}/clients`);
  revalidatePath(`${BASE}/clients/${from_client_id}/edit`);
  redirect(`${BASE}/clients/${from_client_id}/edit?updated=1`);
}

// --- Families ---

function parseUniqueIds(values: FormDataEntryValue[]): string[] {
  const items = values.flatMap((v) =>
    String(v)
      .split(/\r?\n|,/)
      .map((x) => x.trim())
      .filter(Boolean),
  );
  return [...new Set(items)];
}

const FAMILY_MEMBER_POSITIONS = new Set<string>(["father", "mother", "son", "daughter"]);

function parseFamilyMemberPositionField(raw: unknown): TherapyFamilyMemberPosition | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return null;
  if (!FAMILY_MEMBER_POSITIONS.has(raw)) return null;
  return raw as TherapyFamilyMemberPosition;
}

type FamilySlotInput =
  | {
      kind: "existing";
      clientId: string;
      firstName: string;
      lastName: string | null;
      position: TherapyFamilyMemberPosition | null;
    }
  | { kind: "new"; firstName: string; lastName: string | null; position: TherapyFamilyMemberPosition };

function parseFamilySlotsFromForm(formData: FormData, fallbackPath: string): FamilySlotInput[] {
  const raw = (formData.get("family_members_json") as string | null)?.trim() ?? "";
  if (!raw) redirectPrivateClinicScoped(formData, "error", fallbackPath, "members-json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "members-json");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "no-members");
  }
  const out: FamilySlotInput[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") redirectPrivateClinicScoped(formData, "error", fallbackPath, "members-json");
    const rec = item as Record<string, unknown>;
    const kind = rec.kind;
    if (kind === "existing") {
      const clientId = String(rec.clientId ?? "").trim();
      if (!clientId) redirectPrivateClinicScoped(formData, "error", fallbackPath, "members-json");
      const firstName = String(rec.firstName ?? "").trim();
      if (!firstName) redirectPrivateClinicScoped(formData, "error", fallbackPath, "members-json");
      const lastNameRaw = String(rec.lastName ?? "").trim();
      const position = parseFamilyMemberPositionField(rec.position);
      out.push({ kind: "existing", clientId, firstName, lastName: lastNameRaw || null, position });
    } else if (kind === "new") {
      const firstName = String(rec.firstName ?? "").trim();
      const lastNameRaw = String(rec.lastName ?? "").trim();
      const position = parseFamilyMemberPositionField(rec.position);
      if (!firstName || !position) redirectPrivateClinicScoped(formData, "error", fallbackPath, "members-json");
      out.push({ kind: "new", firstName, lastName: lastNameRaw || null, position });
    } else {
      redirectPrivateClinicScoped(formData, "error", fallbackPath, "members-json");
    }
  }
  return out;
}

async function resolveOrderedFamilyMemberRows(
  formData: FormData,
  fallbackPath: string,
  householdId: string,
  userFamilyMemberId: string | null,
  slots: FamilySlotInput[],
  newClientStartDate: Date | null,
  requestedDefaultJobIdRaw: string | null,
  familyName: string,
): Promise<{ clientId: string; member_position: TherapyFamilyMemberPosition | null }[]> {
  const newSlots = slots.filter((s): s is Extract<FamilySlotInput, { kind: "new" }> => s.kind === "new");
  let defaultJobId: string | null = null;
  if (newSlots.length > 0) {
    const requestedDefaultJobId = requestedDefaultJobIdRaw?.trim() ?? "";
    if (requestedDefaultJobId) {
      if (!(await assertJobForCurrentUserScope(householdId, userFamilyMemberId, requestedDefaultJobId))) {
        redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
      }
      defaultJobId = requestedDefaultJobId;
    } else {
      const defaultJob = await prisma.jobs.findFirst({
        where: {
          household_id: householdId,
          is_private_clinic: true,
          is_active: true,
          ...(userFamilyMemberId ? { family_member_id: userFamilyMemberId } : {}),
        },
        orderBy: [{ start_date: "desc" }],
        select: { id: true },
      });
      if (!defaultJob) redirectPrivateClinicScoped(formData, "error", fallbackPath, "no-job");
      defaultJobId = defaultJob.id;
    }
  }

  const createdNewIds = await (async () => {
    if (newSlots.length === 0 || !defaultJobId) return [] as string[];
    return prisma.$transaction(async (tx) => {
      const ids: string[] = [];
      for (const slot of newSlots) {
        const id = crypto.randomUUID();
        await tx.therapy_clients.create({
          data: {
            id,
            household_id: householdId,
            first_name: slot.firstName,
            last_name: familyName,
            default_job_id: defaultJobId,
            visits_per_period_count: 1,
            visits_per_period_weeks: 1,
            ...(newClientStartDate ? { start_date: newClientStartDate } : {}),
          },
        });
        await tx.therapy_clients_jobs.create({
          data: {
            id: crypto.randomUUID(),
            household_id: householdId,
            client_id: id,
            job_id: defaultJobId,
            is_primary: true,
          },
        });
        ids.push(id);
      }
      return ids;
    });
  })();

  let newIdx = 0;
  const resolved: { clientId: string; member_position: TherapyFamilyMemberPosition | null }[] = [];
  for (const slot of slots) {
    if (slot.kind === "existing") {
      if (!(await assertClientForCurrentUserScope(householdId, userFamilyMemberId, slot.clientId))) {
        redirectPrivateClinicScoped(formData, "error", fallbackPath, "client");
      }
      await prisma.therapy_clients.update({
        where: { id: slot.clientId },
        data: {
          first_name: slot.firstName,
          last_name: slot.lastName,
        },
      });
      resolved.push({ clientId: slot.clientId, member_position: slot.position });
    } else {
      const clientId = createdNewIds[newIdx++];
      if (!clientId) redirectPrivateClinicScoped(formData, "error", fallbackPath, "members-json");
      resolved.push({ clientId, member_position: slot.position });
    }
  }
  return resolved;
}

export async function createTherapyFamily(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  await assertFamilyTherapyEnabled(householdId);
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const fallbackPath = `${BASE}/families/new`;
  const name = (formData.get("name") as string | null)?.trim() || "";
  if (!name) redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
  const familyStartDate = parseDate((formData.get("start_date") as string | null) ?? null);
  const familyEndDate = parseDate((formData.get("end_date") as string | null) ?? null);
  const familyDefaultJobIdRaw = (formData.get("default_job_id") as string | null) ?? null;
  const familyDefaultJobId = familyDefaultJobIdRaw?.trim() || null;
  if (!familyDefaultJobId) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }
  if (familyEndDate && familyStartDate && familyEndDate < familyStartDate) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "date-range");
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFamilyMemberId, familyDefaultJobId))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }

  const slots = parseFamilySlotsFromForm(formData, fallbackPath);
  const memberRows = await resolveOrderedFamilyMemberRows(
    formData,
    fallbackPath,
    householdId,
    userFamilyMemberId,
    slots,
    familyStartDate,
    familyDefaultJobId,
    name,
  );
  const mainSlotRaw = Number((formData.get("main_member_slot_index") as string | null) ?? "");
  if (!Number.isInteger(mainSlotRaw) || mainSlotRaw < 0 || mainSlotRaw >= memberRows.length) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "main-member");
  }
  const mainFamilyMemberId = memberRows[mainSlotRaw]!.clientId;

  const billing_basis = parseBillingBasis(formData.get("billing_basis") as string | null);
  const billing_timing = parseBillingTiming(formData.get("billing_timing") as string | null);

  await prisma.$transaction(async (tx) => {
    const familyId = crypto.randomUUID();
    await tx.therapy_families.create({
      data: {
        id: familyId,
        household_id: householdId,
        name,
        start_date: familyStartDate,
        end_date: familyEndDate,
        default_job_id: familyDefaultJobId,
        notes: (formData.get("notes") as string | null)?.trim() || null,
        main_family_member_id: mainFamilyMemberId,
        billing_basis,
        billing_timing,
      },
    });
    for (const row of memberRows) {
      await tx.therapy_family_members.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          family_id: familyId,
          client_id: row.clientId,
          member_position: row.member_position,
        },
      });
      await tx.therapy_clients.update({
        where: { id: row.clientId },
        data: {
          family_id: familyId,
          default_job_id: familyDefaultJobId,
          ...(familyStartDate ? { start_date: familyStartDate } : {}),
        },
      });
    }
  });

  revalidatePath(`${BASE}/families`);
  revalidatePath(`${BASE}/clients`);
  revalidatePath(`${BASE}/treatments`);
  revalidatePath(`${BASE}/receipts`);
  redirect(`${BASE}/families?created=1`);
}

export async function updateTherapyFamily(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  await assertFamilyTherapyEnabled(householdId);
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string | null)?.trim() || "";
  const fallbackPath = id ? `${BASE}/families/${id}/edit` : `${BASE}/families`;
  if (!id) redirectPrivateClinicScoped(formData, "error", `${BASE}/families`, "missing");
  const existing = await prisma.therapy_families.findFirst({
    where: { id, household_id: householdId },
    select: { id: true },
  });
  if (!existing) redirectPrivateClinicScoped(formData, "error", `${BASE}/families`, "notfound");
  const familyStartDate = parseDate((formData.get("start_date") as string | null) ?? null);
  const familyEndDate = parseDate((formData.get("end_date") as string | null) ?? null);
  const familyDefaultJobIdRaw = (formData.get("default_job_id") as string | null) ?? null;
  const familyDefaultJobId = familyDefaultJobIdRaw?.trim() || null;
  if (!familyDefaultJobId) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }
  if (familyEndDate && familyStartDate && familyEndDate < familyStartDate) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "date-range");
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFamilyMemberId, familyDefaultJobId))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }

  const slots = parseFamilySlotsFromForm(formData, fallbackPath);
  const memberRows = await resolveOrderedFamilyMemberRows(
    formData,
    fallbackPath,
    householdId,
    userFamilyMemberId,
    slots,
    familyStartDate,
    familyDefaultJobId,
    (formData.get("name") as string | null)?.trim() || "",
  );
  const mainSlotRaw = Number((formData.get("main_member_slot_index") as string | null) ?? "");
  if (!Number.isInteger(mainSlotRaw) || mainSlotRaw < 0 || mainSlotRaw >= memberRows.length) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "main-member");
  }
  const mainFamilyMemberId = memberRows[mainSlotRaw]!.clientId;

  const billing_basis = parseBillingBasis(formData.get("billing_basis") as string | null);
  const billing_timing = parseBillingTiming(formData.get("billing_timing") as string | null);

  await prisma.$transaction(async (tx) => {
    await tx.therapy_families.update({
      where: { id },
      data: {
        name: (formData.get("name") as string | null)?.trim() || "",
        start_date: familyStartDate,
        end_date: familyEndDate,
        default_job_id: familyDefaultJobId,
        notes: (formData.get("notes") as string | null)?.trim() || null,
        main_family_member_id: mainFamilyMemberId,
        billing_basis,
        billing_timing,
      },
    });
    await tx.therapy_family_members.deleteMany({ where: { family_id: id, household_id: householdId } });
    await tx.therapy_clients.updateMany({
      where: { household_id: householdId, family_id: id },
      data: { family_id: null },
    });
    for (const row of memberRows) {
      await tx.therapy_family_members.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          family_id: id,
          client_id: row.clientId,
          member_position: row.member_position,
        },
      });
      await tx.therapy_clients.update({
        where: { id: row.clientId },
        data: {
          family_id: id,
          default_job_id: familyDefaultJobId,
          ...(familyStartDate ? { start_date: familyStartDate } : {}),
        },
      });
    }
  });

  revalidatePath(`${BASE}/families`);
  revalidatePath(`${BASE}/clients`);
  revalidatePath(`${BASE}/treatments`);
  revalidatePath(`${BASE}/receipts`);
  redirect(`${BASE}/families/${id}/edit?updated=1`);
}

export async function deleteTherapyFamily(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  await assertFamilyTherapyEnabled(householdId);
  const id = (formData.get("id") as string | null)?.trim() || "";
  const deleteMembersAsClients = (formData.get("delete_members_as_clients") as string | null)?.trim() === "1";
  if (!id) redirect(`${BASE}/families?error=missing`);
  const row = await prisma.therapy_families.findFirst({
    where: { id, household_id: householdId },
    select: { id: true },
  });
  if (!row) redirect(`${BASE}/families?error=notfound`);

  const memberIds = (
    await prisma.therapy_family_members.findMany({
      where: { household_id: householdId, family_id: id },
      select: { client_id: true },
    })
  ).map((m) => m.client_id);

  if (deleteMembersAsClients && memberIds.length > 0) {
    if (await hasAssociatedTreatmentsForClients(householdId, memberIds)) {
      redirect(`${BASE}/families/${id}/edit?error=members-have-treatments`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.therapy_clients.updateMany({
      where: { household_id: householdId, family_id: id },
      data: { family_id: null },
    });
    await tx.therapy_family_members.deleteMany({ where: { household_id: householdId, family_id: id } });
    await tx.therapy_families.delete({ where: { id } });
    if (deleteMembersAsClients && memberIds.length > 0) {
      await tx.therapy_clients.deleteMany({
        where: { household_id: householdId, id: { in: memberIds } },
      });
    }
  });

  revalidatePath(`${BASE}/families`);
  revalidatePath(`${BASE}/clients`);
  revalidatePath(`${BASE}/treatments`);
  revalidatePath(`${BASE}/receipts`);
  redirect(`${BASE}/families?updated=1`);
}

// --- Treatments ---

export async function createTherapyTreatment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const fallbackPath = `${BASE}/treatments`;
  const client_id = (formData.get("client_id") as string)?.trim() || "";
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const program_id_raw = (formData.get("program_id") as string)?.trim() || "";
  const occurred_date = (formData.get("occurred_date") as string)?.trim() || "";
  const occurred_time = (formData.get("occurred_time") as string)?.trim() || "";
  const amountStr = parseMoney(formData.get("amount") as string);
  const visit_type = parseVisitType((formData.get("visit_type") as string)?.trim() || null);

  if (!client_id || !job_id || !occurred_date || !amountStr || !visit_type) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
  }
  if (!(await assertClientForCurrentUserScope(householdId, userFm, client_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "client");
  }
  const primaryClient = await prisma.therapy_clients.findFirst({
    where: { id: client_id, household_id: householdId },
    select: { family_id: true, billing_basis: true, billing_timing: true },
  });
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }
  const selectedJob = await prisma.jobs.findFirst({
    where: {
      id: job_id,
      household_id: householdId,
      ...(userFm ? { family_member_id: userFm } : {}),
    },
    select: { is_private_clinic: true, external_reporting_system: true },
  });
  if (!selectedJob) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }
  const programCountForJob = await prisma.therapy_service_programs.count({
    where: { household_id: householdId, job_id },
  });
  const program_id: string | null = program_id_raw || null;
  if (programCountForJob > 0) {
    if (!program_id) redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
  }
  if (program_id) {
    const prog = await assertProgram(householdId, program_id);
    if (!prog || prog.job_id !== job_id) redirectPrivateClinicScoped(formData, "error", fallbackPath, "program");
  }

  const occurred_at = parseTherapyOccurredAtFromForm(occurred_date, occurred_time);
  if (!occurred_at) redirectPrivateClinicScoped(formData, "error", fallbackPath, "date");

  const linkRaw = (formData.get("linked_transaction_id") as string)?.trim();
  let linked_transaction_id: string | null = null;
  if (linkRaw) {
    const txRow = await prisma.transactions.findFirst({
      where: { id: linkRaw, household_id: householdId },
      select: { id: true },
    });
    linked_transaction_id = txRow?.id ?? null;
  }

  const payment = await resolveTherapyTreatmentPaymentFields(
    householdId,
    formData,
    isOrganizationPaidPrivateClinicJob(selectedJob),
  );
  const reportedToExternalSystem =
    Boolean(selectedJob.external_reporting_system) && formData.get("reported_to_external_system") === "1";

  const createdTreatment = await prisma.therapy_treatments.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      client_id,
      family_id: primaryClient?.family_id ?? null,
      job_id,
      program_id,
      occurred_at,
      amount: amountStr,
      currency: (formData.get("currency") as string)?.trim() || "ILS",
      visit_type,
      note_1: (formData.get("note_1") as string)?.trim() || null,
      note_2: (formData.get("note_2") as string)?.trim() || null,
      note_3: (formData.get("note_3") as string)?.trim() || null,
      linked_transaction_id,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      payment_bank_account_id: payment.payment_bank_account_id,
      payment_digital_payment_method_id: payment.payment_digital_payment_method_id,
      reported_to_external_system: reportedToExternalSystem,
    },
  });

  const inlineReceiptNumber = (formData.get("receipt_number") as string)?.trim() || "";
  const inlineReceiptIssuedAt = parseDateRequired((formData.get("receipt_issued_at") as string)?.trim() || null);
  if (inlineReceiptNumber && inlineReceiptIssuedAt) {
    const receiptId = crypto.randomUUID();
    const inlineReceiptKind = await resolveReceiptKindForJob(householdId, job_id, null);
    if (!inlineReceiptKind) {
      redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
    }
    await prisma.therapy_receipts.create({
      data: {
        id: receiptId,
        household_id: householdId,
        job_id,
        client_id,
        family_id: primaryClient?.family_id ?? null,
        program_id,
        receipt_number: inlineReceiptNumber,
        issued_at: inlineReceiptIssuedAt,
        total_amount: amountStr,
        net_amount: amountStr,
        receipt_kind: inlineReceiptKind,
        currency: (formData.get("currency") as string)?.trim() || "ILS",
        recipient_type: "client",
        payment_method: "cash",
      },
    });
    await prisma.therapy_receipt_allocations.create({
      data: {
        id: crypto.randomUUID(),
        household_id: householdId,
        receipt_id: receiptId,
        treatment_id: createdTreatment.id,
        amount: amountStr,
      },
    });
  }

  revalidatePath(`${BASE}/treatments`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/treatments?created=1`);
}

export async function updateTherapyTreatment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const fallbackPath = `${BASE}/treatments`;
  const id = (formData.get("id") as string)?.trim() || "";
  const row = await prisma.therapy_treatments.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirectPrivateClinicScoped(formData, "error", fallbackPath, "notfound");
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "notfound");
  }

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const program_id_raw = (formData.get("program_id") as string)?.trim() || "";
  const occurred_date = (formData.get("occurred_date") as string)?.trim() || "";
  const occurred_time = (formData.get("occurred_time") as string)?.trim() || "";
  const amountStr = parseMoney(formData.get("amount") as string);
  const visit_type = parseVisitType((formData.get("visit_type") as string)?.trim() || null);

  if (!job_id || !occurred_date || !amountStr || !visit_type) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }
  const primaryClient = await prisma.therapy_clients.findFirst({
    where: { id: row.client_id, household_id: householdId },
    select: { family_id: true, billing_basis: true, billing_timing: true },
  });
  const selectedJob = await prisma.jobs.findFirst({
    where: {
      id: job_id,
      household_id: householdId,
      ...(userFm ? { family_member_id: userFm } : {}),
    },
    select: { is_private_clinic: true, external_reporting_system: true },
  });
  if (!selectedJob) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }
  const programCountForJob = await prisma.therapy_service_programs.count({
    where: { household_id: householdId, job_id },
  });
  const program_id: string | null = program_id_raw || null;
  if (programCountForJob > 0) {
    if (!program_id) redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
  }
  if (program_id) {
    const prog = await assertProgram(householdId, program_id);
    if (!prog || prog.job_id !== job_id) redirectPrivateClinicScoped(formData, "error", fallbackPath, "program");
  }

  const occurred_at = parseTherapyOccurredAtFromForm(occurred_date, occurred_time);
  if (!occurred_at) redirectPrivateClinicScoped(formData, "error", fallbackPath, "date");

  const linkRaw = (formData.get("linked_transaction_id") as string)?.trim();
  let linked_transaction_id: string | null = null;
  if (linkRaw) {
    const txRow = await prisma.transactions.findFirst({
      where: { id: linkRaw, household_id: householdId },
      select: { id: true },
    });
    linked_transaction_id = txRow?.id ?? null;
  }

  const payment = await resolveTherapyTreatmentPaymentFields(
    householdId,
    formData,
    isOrganizationPaidPrivateClinicJob(selectedJob),
  );
  const reportedToExternalSystem =
    Boolean(selectedJob.external_reporting_system) && formData.get("reported_to_external_system") === "1";

  await prisma.therapy_treatments.update({
    where: { id },
    data: {
      job_id,
      family_id: primaryClient?.family_id ?? null,
      program_id,
      occurred_at,
      amount: amountStr,
      currency: (formData.get("currency") as string)?.trim() || "ILS",
      visit_type,
      note_1: (formData.get("note_1") as string)?.trim() || null,
      note_2: (formData.get("note_2") as string)?.trim() || null,
      note_3: (formData.get("note_3") as string)?.trim() || null,
      linked_transaction_id,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      payment_bank_account_id: payment.payment_bank_account_id,
      payment_digital_payment_method_id: payment.payment_digital_payment_method_id,
      reported_to_external_system: reportedToExternalSystem,
    },
  });

  revalidatePath(`${BASE}/treatments`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/treatments?updated=1`);
}

export async function setTherapyTreatmentExternalReportingStatus(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const fallbackPath = `${BASE}/treatments`;
  const treatmentId = (formData.get("treatment_id") as string)?.trim() || "";
  if (!treatmentId) redirectPrivateClinicScoped(formData, "error", fallbackPath, "id");

  const row = await prisma.therapy_treatments.findFirst({
    where: { id: treatmentId, household_id: householdId },
    select: { id: true, job_id: true },
  });
  if (!row) redirectPrivateClinicScoped(formData, "error", fallbackPath, "notfound");
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "notfound");
  }

  const job = await prisma.jobs.findFirst({
    where: { id: row.job_id, household_id: householdId },
    select: { external_reporting_system: true },
  });
  if (!job?.external_reporting_system) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }

  await prisma.therapy_treatments.update({
    where: { id: row.id },
    data: {
      reported_to_external_system: formData.get("reported_to_external_system") === "1",
    },
  });

  revalidatePath(`${BASE}/treatments`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/treatments?updated=1`);
}

export async function deleteTherapyTreatment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const fallbackPath = `${BASE}/treatments`;
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirectPrivateClinicScoped(formData, "error", fallbackPath, "id");
  const row = await prisma.therapy_treatments.findFirst({
    where: { id, household_id: householdId },
    select: { job_id: true },
  });
  if (!row) redirectPrivateClinicScoped(formData, "error", fallbackPath, "notfound");
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "notfound");
  }
  await prisma.therapy_treatments.deleteMany({ where: { id, household_id: householdId } });
  revalidatePath(`${BASE}/treatments`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/treatments?updated=1`);
}

// --- Receipts ---

export async function createTherapyReceipt(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const fallbackPath = `${BASE}/receipts`;
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const receipt_number = (formData.get("receipt_number") as string)?.trim() || "";
  const issued_at = parseDateRequired((formData.get("issued_at") as string) || null);
  const totalStr = parseMoney(formData.get("total_amount") as string);
  const netStr = parseMoney(formData.get("net_amount") as string) ?? totalStr;
  const receipt_kind = await resolveReceiptKindForJob(
    householdId,
    job_id,
    (formData.get("receipt_kind") as string | null) ?? null,
  );
  const recipient_type = parseRecipientType((formData.get("recipient_type") as string)?.trim() || null);
  const payment_method = parseReceiptPaymentMethod((formData.get("payment_method") as string)?.trim() || null);
  const covered_period_start = parseDate((formData.get("covered_period_start") as string)?.trim() || null);
  const covered_period_end = parseDate((formData.get("covered_period_end") as string)?.trim() || null);
  const program_id_raw = (formData.get("program_id") as string)?.trim() || "";
  const client_id_raw = (formData.get("client_id") as string)?.trim() || "";

  if (!job_id || !receipt_number || !issued_at || !totalStr || !netStr || !receipt_kind || !recipient_type || !payment_method) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }

  const program_id: string | null = program_id_raw || null;
  if (program_id) {
    const prog = await assertProgram(householdId, program_id);
    if (!prog || prog.job_id !== job_id) {
      redirectPrivateClinicScoped(formData, "error", fallbackPath, "program");
    }
  }

  let resolved_client_id: string | null = null;
  let resolved_family_id: string | null = null;
  if (recipient_type === "client") {
    if (!client_id_raw) redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
    const ok = await assertReceiptClientPicker(householdId, userFm, client_id_raw, null);
    if (!ok) redirectPrivateClinicScoped(formData, "error", fallbackPath, "client");
    resolved_client_id = ok;
    const c = await prisma.therapy_clients.findFirst({
      where: { id: ok, household_id: householdId },
      select: { family_id: true },
    });
    resolved_family_id = c?.family_id ?? null;
  }

  const linkRaw = (formData.get("linked_transaction_id") as string)?.trim();
  let linked_transaction_id: string | null = null;
  if (linkRaw) {
    const txRow = await prisma.transactions.findFirst({
      where: { id: linkRaw, household_id: householdId },
      select: { id: true },
    });
    linked_transaction_id = txRow?.id ?? null;
  }

  const id = crypto.randomUUID();
  await prisma.therapy_receipts.create({
    data: {
      id,
      household_id: householdId,
      job_id,
      client_id: resolved_client_id,
      family_id: resolved_family_id,
      program_id,
      receipt_number,
      issued_at,
      total_amount: totalStr,
      net_amount: netStr,
      receipt_kind,
      currency: (formData.get("currency") as string)?.trim() || "ILS",
      recipient_type,
      payment_method,
      covered_period_start,
      covered_period_end,
      notes: (formData.get("notes") as string)?.trim() || null,
      linked_transaction_id,
    },
  });

  revalidatePath(`${BASE}/receipts`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/receipts/${id}`);
}

export async function updateTherapyReceipt(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const fallbackPath = `${BASE}/receipts`;
  const id = (formData.get("id") as string)?.trim() || "";
  const row = await prisma.therapy_receipts.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirectPrivateClinicScoped(formData, "error", fallbackPath, "notfound");
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "notfound");
  }

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const issued_at = parseDateRequired((formData.get("issued_at") as string) || null);
  const totalStr = parseMoney(formData.get("total_amount") as string);
  const netStr = parseMoney(formData.get("net_amount") as string) ?? totalStr;
  const receipt_kind =
    (await resolveReceiptKindForJob(householdId, job_id, (formData.get("receipt_kind") as string | null) ?? row.receipt_kind)) ??
    row.receipt_kind;
  if (!job_id || !issued_at || !totalStr || !netStr || !receipt_kind) redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }

  const linkRaw = (formData.get("linked_transaction_id") as string)?.trim();
  let linked_transaction_id: string | null = null;
  if (linkRaw) {
    const txRow = await prisma.transactions.findFirst({
      where: { id: linkRaw, household_id: householdId },
      select: { id: true },
    });
    linked_transaction_id = txRow?.id ?? null;
  }

  const recipient_type = parseRecipientType((formData.get("recipient_type") as string)?.trim() || null);
  const payment_method = parseReceiptPaymentMethod((formData.get("payment_method") as string)?.trim() || null);
  const covered_period_start = parseDate((formData.get("covered_period_start") as string)?.trim() || null);
  const covered_period_end = parseDate((formData.get("covered_period_end") as string)?.trim() || null);
  const program_id_raw = (formData.get("program_id") as string)?.trim() || "";
  const client_id_raw = (formData.get("client_id") as string)?.trim() || "";
  if (!recipient_type || !payment_method) redirectPrivateClinicScoped(formData, "error", fallbackPath, "badenum");

  const program_id: string | null = program_id_raw || null;
  if (program_id) {
    const prog = await assertProgram(householdId, program_id);
    if (!prog || prog.job_id !== job_id) {
      redirectPrivateClinicScoped(formData, "error", fallbackPath, "program");
    }
  }

  let resolved_client_id: string | null = null;
  let resolved_family_id: string | null = null;
  if (recipient_type === "client") {
    if (!client_id_raw) redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
    const ok = await assertReceiptClientPicker(householdId, userFm, client_id_raw, row.client_id);
    if (!ok) redirectPrivateClinicScoped(formData, "error", fallbackPath, "client");
    resolved_client_id = ok;
    const c = await prisma.therapy_clients.findFirst({
      where: { id: ok, household_id: householdId },
      select: { family_id: true },
    });
    resolved_family_id = c?.family_id ?? null;
  }

  await prisma.therapy_receipts.update({
    where: { id },
    data: {
      job_id,
      client_id: resolved_client_id,
      family_id: resolved_family_id,
      program_id,
      receipt_number: (formData.get("receipt_number") as string)?.trim() || row.receipt_number,
      issued_at,
      total_amount: totalStr,
      net_amount: netStr,
      receipt_kind,
      currency: (formData.get("currency") as string)?.trim() || "ILS",
      recipient_type,
      payment_method,
      covered_period_start,
      covered_period_end,
      notes: (formData.get("notes") as string)?.trim() || null,
      linked_transaction_id,
    },
  });

  revalidatePath(`${BASE}/receipts`);
  revalidatePath(`${BASE}/receipts/${id}`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/receipts/${id}?updated=1`);
}

export async function upsertReceiptAllocation(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const receipt_id = (formData.get("receipt_id") as string)?.trim() || "";
  const treatment_id = (formData.get("treatment_id") as string)?.trim() || "";
  const amountStr = parseMoney(formData.get("amount") as string);
  if (!receipt_id || !treatment_id || !amountStr) return;

  const receipt = await prisma.therapy_receipts.findFirst({
    where: { id: receipt_id, household_id: householdId },
  });
  const treatment = await prisma.therapy_treatments.findFirst({
    where: { id: treatment_id, household_id: householdId },
  });
  if (!receipt || !treatment || receipt.job_id !== treatment.job_id) return;
  if (!(await assertJobForCurrentUserScope(householdId, userFm, receipt.job_id))) return;

  await prisma.therapy_receipt_allocations.upsert({
    where: {
      receipt_id_treatment_id: { receipt_id, treatment_id },
    },
    create: {
      id: crypto.randomUUID(),
      household_id: householdId,
      receipt_id,
      treatment_id,
      amount: amountStr,
    },
    update: { amount: amountStr },
  });

  revalidatePath(`${BASE}/receipts`);
  revalidatePath(`${BASE}/receipts/${receipt_id}`);
  revalidatePath(`${BASE}/treatments`);
  redirect(`${BASE}/receipts/${receipt_id}`);
}

export async function deleteReceiptAllocation(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const receiptId = (formData.get("receipt_id") as string)?.trim() || "";
  const treatmentId = (formData.get("treatment_id") as string)?.trim() || "";
  const redirectTo = (formData.get("redirect_to") as string)?.trim() || "";
  if (!receiptId || !treatmentId) return;
  await prisma.therapy_receipt_allocations.deleteMany({
    where: {
      receipt_id: receiptId,
      treatment_id: treatmentId,
      household_id: householdId,
    },
  });
  revalidatePath(`${BASE}/receipts`);
  revalidatePath(`${BASE}/receipts/${receiptId}`);
  revalidatePath(`${BASE}/treatments`);
  if (redirectTo && redirectTo.startsWith(`${BASE}/`)) {
    redirect(redirectTo);
  }
  redirect(`${BASE}/receipts/${receiptId}`);
}

export async function createTherapyReceiptForSelectedTreatments(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const fallbackPath = `${BASE}/treatments`;
  const treatmentIds = (formData.getAll("treatment_ids") as string[]).map((id) => id.trim()).filter(Boolean);
  const receiptNumber = (formData.get("receipt_number") as string)?.trim() || "";
  const issuedAt = parseDateRequired((formData.get("issued_at") as string)?.trim() || null);
  const totalStr = parseMoney(formData.get("total_amount") as string);
  const netStr = totalStr;
  if (!treatmentIds.length || !receiptNumber || !issuedAt || !totalStr || !netStr) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
  }
  const treatments = await prisma.therapy_treatments.findMany({
    where: { household_id: householdId, id: { in: treatmentIds } },
    select: { id: true, job_id: true, amount: true, currency: true, client_id: true, family_id: true, program_id: true },
  });
  if (treatments.length !== treatmentIds.length) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "notfound");
  }
  const jobId = treatments[0]!.job_id;
  const receiptKind = await resolveReceiptKindForJob(householdId, jobId, null);
  if (treatments.some((t) => t.job_id !== jobId)) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, jobId)) || !receiptKind) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }
  const receiptId = crypto.randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.therapy_receipts.create({
      data: {
        id: receiptId,
        household_id: householdId,
        job_id: jobId,
        client_id: treatments[0]!.client_id,
        family_id: treatments[0]!.family_id,
        program_id: treatments[0]!.program_id,
        receipt_number: receiptNumber,
        issued_at: issuedAt,
        total_amount: totalStr,
        net_amount: netStr,
        receipt_kind: receiptKind,
        currency: treatments[0]!.currency,
        recipient_type: "client",
        payment_method: "cash",
      },
    });
    for (const treatment of treatments) {
      await tx.therapy_receipt_allocations.upsert({
        where: { receipt_id_treatment_id: { receipt_id: receiptId, treatment_id: treatment.id } },
        create: {
          id: crypto.randomUUID(),
          household_id: householdId,
          receipt_id: receiptId,
          treatment_id: treatment.id,
          amount: treatment.amount,
        },
        update: { amount: treatment.amount },
      });
    }
  });
  revalidatePath(`${BASE}/treatments`);
  revalidatePath(`${BASE}/receipts`);
  redirectPrivateClinicScoped(formData, "success", `${BASE}/receipts/${receiptId}`);
}

export async function linkTreatmentsToReceipt(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const receiptId = (formData.get("receipt_id") as string)?.trim() || "";
  const treatmentIds = (formData.getAll("treatment_ids") as string[]).map((id) => id.trim()).filter(Boolean);
  if (!receiptId || treatmentIds.length === 0) return;
  const receipt = await prisma.therapy_receipts.findFirst({
    where: { id: receiptId, household_id: householdId },
    select: {
      id: true,
      job_id: true,
      recipient_type: true,
      covered_period_start: true,
      covered_period_end: true,
    },
  });
  if (!receipt) return;
  if (!(await assertJobForCurrentUserScope(householdId, userFm, receipt.job_id))) return;

  const orgRangeWhere =
    receipt.recipient_type === "organization" && receipt.covered_period_start && receipt.covered_period_end
      ? {
          occurred_at: {
            gte: receipt.covered_period_start,
            lte: endOfUtcDayForReceipt(receipt.covered_period_end),
          },
        }
      : {};

  const treatments = await prisma.therapy_treatments.findMany({
    where: {
      household_id: householdId,
      id: { in: treatmentIds },
      job_id: receipt.job_id,
      receipt_allocations: { none: {} },
      ...orgRangeWhere,
    },
    select: { id: true, amount: true },
  });
  await prisma.$transaction(
    treatments.map((treatment) =>
      prisma.therapy_receipt_allocations.upsert({
        where: { receipt_id_treatment_id: { receipt_id: receiptId, treatment_id: treatment.id } },
        create: {
          id: crypto.randomUUID(),
          household_id: householdId,
          receipt_id: receiptId,
          treatment_id: treatment.id,
          amount: treatment.amount,
        },
        update: { amount: treatment.amount },
      }),
    ),
  );
  revalidatePath(`${BASE}/receipts`);
  revalidatePath(`${BASE}/receipts/${receiptId}`);
  revalidatePath(`${BASE}/treatments`);
  redirect(`${BASE}/receipts/${receiptId}`);
}

// --- Expenses ---

export async function createTherapyExpenseCategory(formData: FormData) {
  const { householdId, isSuperAdminContext } = await householdIdForTherapyHouseholdScopedForms(formData);
  await ensureDefaultExpenseCategories(householdId);
  const name = (formData.get("name") as string)?.trim() || "";
  const name_he = (formData.get("name_he") as string)?.trim() || null;
  if (!name) redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "error=cat");

  await prisma.therapy_expense_categories.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      name_he,
      is_system: false,
      sort_order: 100,
    },
  });

  revalidatePath(`${BASE}/expenses`);
  revalidatePath(`${BASE}/settings`);
  if (isSuperAdminContext) {
    revalidatePath(`${ADMIN_HOUSEHOLDS}/${householdId}/edit`);
  }
  redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "saved=cat");
}

export async function updateTherapyExpenseCategory(formData: FormData) {
  const { householdId, isSuperAdminContext } = await householdIdForTherapyHouseholdScopedForms(formData);
  const id = (formData.get("id") as string)?.trim() || "";
  const name = (formData.get("name") as string)?.trim() || "";
  const name_he = (formData.get("name_he") as string)?.trim() || null;
  if (!id || !name) redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "error=cat");

  await prisma.therapy_expense_categories.updateMany({
    where: { id, household_id: householdId },
    data: { name, name_he },
  });

  revalidatePath(`${BASE}/expenses`);
  revalidatePath(`${BASE}/settings`);
  if (isSuperAdminContext) {
    revalidatePath(`${ADMIN_HOUSEHOLDS}/${householdId}/edit`);
  }
  redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "saved=1");
}

export async function deleteTherapyExpenseCategory(formData: FormData) {
  const { householdId, isSuperAdminContext } = await householdIdForTherapyHouseholdScopedForms(formData);
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "error=cat");

  const category = await prisma.therapy_expense_categories.findFirst({
    where: { id, household_id: householdId },
    select: { id: true, is_system: true },
  });
  if (!category || category.is_system) redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "error=cat");

  const usageCount = await prisma.therapy_job_expenses.count({
    where: { household_id: householdId, category_id: id },
  });
  if (usageCount > 0) {
    redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "error=cat-in-use");
  }

  await prisma.therapy_expense_categories.delete({ where: { id } });

  revalidatePath(`${BASE}/expenses`);
  revalidatePath(`${BASE}/settings`);
  if (isSuperAdminContext) {
    revalidatePath(`${ADMIN_HOUSEHOLDS}/${householdId}/edit`);
  }
  redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "saved=1");
}

export async function createTherapyJobExpense(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  await ensureDefaultExpenseCategories(householdId);
  const fallbackSuccess = `${BASE}/expenses?created=1`;
  const fallbackError = `${BASE}/expenses`;

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const category_id = (formData.get("category_id") as string)?.trim() || "";
  const expense_date = parseDateRequired((formData.get("expense_date") as string) || null);
  const amountStr = parseMoney(formData.get("amount") as string);
  if (!job_id || !category_id || !expense_date || !amountStr) {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "missing");
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "job");
  }

  const cat = await prisma.therapy_expense_categories.findFirst({
    where: { id: category_id, household_id: householdId },
  });
  if (!cat) redirectPrivateClinicScoped(formData, "error", fallbackError, "cat");

  const linkRaw = (formData.get("linked_transaction_id") as string)?.trim();
  let linked_transaction_id: string | null = null;
  if (linkRaw) {
    const txRow = await prisma.transactions.findFirst({
      where: { id: linkRaw, household_id: householdId },
      select: { id: true },
    });
    linked_transaction_id = txRow?.id ?? null;
  }

  await prisma.therapy_job_expenses.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      job_id,
      category_id,
      expense_date,
      amount: amountStr,
      currency: (formData.get("currency") as string)?.trim() || "ILS",
      notes: (formData.get("notes") as string)?.trim() || null,
      linked_transaction_id,
    },
  });

  revalidatePath(`${BASE}/expenses`);
  redirectPrivateClinicScoped(formData, "success", fallbackSuccess);
}

export async function updateTherapyJobExpense(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  const row = await prisma.therapy_job_expenses.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirect(`${BASE}/expenses?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) redirect(`${BASE}/expenses?error=notfound`);

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const category_id = (formData.get("category_id") as string)?.trim() || "";
  const expense_date = parseDateRequired((formData.get("expense_date") as string) || null);
  const amountStr = parseMoney(formData.get("amount") as string);
  if (!job_id || !category_id || !expense_date || !amountStr) {
    redirect(`${BASE}/expenses?error=missing`);
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) redirect(`${BASE}/expenses?error=job`);

  const linkRaw = (formData.get("linked_transaction_id") as string)?.trim();
  let linked_transaction_id: string | null = null;
  if (linkRaw) {
    const txRow = await prisma.transactions.findFirst({
      where: { id: linkRaw, household_id: householdId },
      select: { id: true },
    });
    linked_transaction_id = txRow?.id ?? null;
  }

  await prisma.therapy_job_expenses.update({
    where: { id },
    data: {
      job_id,
      category_id,
      expense_date,
      amount: amountStr,
      currency: (formData.get("currency") as string)?.trim() || "ILS",
      notes: (formData.get("notes") as string)?.trim() || null,
      linked_transaction_id,
    },
  });

  revalidatePath(`${BASE}/expenses`);
  redirect(`${BASE}/expenses?updated=1`);
}

export async function deleteTherapyJobExpense(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirect(`${BASE}/expenses?error=id`);
  const row = await prisma.therapy_job_expenses.findFirst({
    where: { id, household_id: householdId },
    select: { job_id: true },
  });
  if (!row) redirect(`${BASE}/expenses?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) redirect(`${BASE}/expenses?error=notfound`);
  await prisma.therapy_job_expenses.deleteMany({ where: { id, household_id: householdId } });
  revalidatePath(`${BASE}/expenses`);
  redirect(`${BASE}/expenses?updated=1`);
}

// --- Appointments ---

const APPOINTMENT_AUDIT_INCLUDE = {
  client: true,
  job: true,
  program: true,
  participants: {
    include: {
      client: true,
    },
  },
} as const;

async function syncAppointmentParticipants(params: {
  householdId: string;
  appointmentId: string;
  primaryClientId: string;
  participantIdsRaw: string[];
}) {
  const participantIds = [...new Set([params.primaryClientId, ...params.participantIdsRaw])];
  await prisma.therapy_appointment_participants.deleteMany({
    where: { household_id: params.householdId, appointment_id: params.appointmentId },
  });
  for (const clientId of participantIds) {
    await prisma.therapy_appointment_participants.create({
      data: {
        id: crypto.randomUUID(),
        household_id: params.householdId,
        appointment_id: params.appointmentId,
        client_id: clientId,
      },
    });
  }
}

function appointmentsSuccessRedirect(formData: FormData, fallback: string): never {
  let path = (formData.get("redirect_on_success") as string | null)?.trim() || fallback;
  if (!path.startsWith(`${BASE}/`)) path = fallback;
  redirect(path);
}

export async function createTherapyAppointment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/");
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const client_id = (formData.get("client_id") as string)?.trim() || "";
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const program_id = (formData.get("program_id") as string)?.trim() || "";
  const visit_type = parseVisitType((formData.get("visit_type") as string)?.trim() || null);
  const start_at_raw = (formData.get("start_at") as string)?.trim() || "";
  if (!client_id || !job_id || !visit_type || !start_at_raw) {
    redirect(`${BASE}/appointments?error=missing`);
  }
  if (!(await assertClientForCurrentUserScope(householdId, userFm, client_id))) {
    redirect(`${BASE}/appointments?error=client`);
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) redirect(`${BASE}/appointments?error=job`);

  const start_at = new Date(start_at_raw);
  if (Number.isNaN(start_at.getTime())) redirect(`${BASE}/appointments?error=date`);

  let programIdOrNull: string | null = program_id || null;
  if (programIdOrNull) {
    const p = await assertProgram(householdId, programIdOrNull);
    if (!p || p.job_id !== job_id) programIdOrNull = null;
  }

  const appointmentId = crypto.randomUUID();
  const primaryClient = await prisma.therapy_clients.findFirst({
    where: { id: client_id, household_id: householdId },
    select: { family_id: true },
  });
  const created = await prisma.therapy_appointments.create({
    data: {
      id: appointmentId,
      household_id: householdId,
      client_id,
      family_id: primaryClient?.family_id ?? null,
      job_id,
      program_id: programIdOrNull,
      visit_type,
      start_at,
      end_at: parseDate((formData.get("end_at") as string) || null),
      status: "scheduled",
    },
    include: APPOINTMENT_AUDIT_INCLUDE,
  });
  await syncAppointmentParticipants({
    householdId,
    appointmentId: created.id,
    primaryClientId: client_id,
    participantIdsRaw: [],
  });
  const createdWithParticipants = await prisma.therapy_appointments.findFirst({
    where: { id: created.id, household_id: householdId },
    include: APPOINTMENT_AUDIT_INCLUDE,
  });

  await logTherapyAppointmentAudit({
    householdId,
    userId,
    appointmentId: created.id,
    action: TherapyAppointmentAuditAction.create,
    metadata: { snapshot: appointmentToSnapshot(createdWithParticipants ?? created) },
  });

  revalidatePath(`${BASE}/appointments`);
  revalidatePath(`${BASE}/reports`);
  appointmentsSuccessRedirect(formData, `${BASE}/appointments?created=1`);
}

export async function cancelTherapyAppointment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/");
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  const cancellationReasonDetails = getAppointmentChangeReasonAndNotes(
    formData,
    "cancellation_reason",
    "cancellation_notes",
  );
  const cancellation_reason = parseAppointmentChangeReason(
    formData,
    "cancellation_reason",
    "cancellation_notes",
  );
  if (!id || !cancellation_reason || !cancellationReasonDetails) redirect(`${BASE}/appointments?error=missing`);

  const before = await prisma.therapy_appointments.findFirst({
    where: { id, household_id: householdId },
    include: APPOINTMENT_AUDIT_INCLUDE,
  });
  if (!before) redirect(`${BASE}/appointments?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, before.job_id))) {
    redirect(`${BASE}/appointments?error=job`);
  }

  await prisma.therapy_appointments.updateMany({
    where: { id, household_id: householdId },
    data: { status: "cancelled", cancellation_reason },
  });

  const after = await prisma.therapy_appointments.findFirst({
    where: { id, household_id: householdId },
    include: APPOINTMENT_AUDIT_INCLUDE,
  });
  if (after) {
    await logTherapyAppointmentAudit({
      householdId,
      userId,
      appointmentId: id,
      action: TherapyAppointmentAuditAction.cancel,
      metadata: {
        before: appointmentToSnapshot(before),
        after: appointmentToSnapshot(after),
        reason: cancellationReasonDetails.reason,
        notes: cancellationReasonDetails.notes,
      },
    });
  }

  revalidatePath(`${BASE}/appointments`);
  revalidatePath(`${BASE}/reports`);
  appointmentsSuccessRedirect(formData, `${BASE}/appointments?updated=1`);
}

export async function rescheduleTherapyAppointment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/");
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  const start_at_raw = (formData.get("start_at") as string)?.trim() || "";
  const rescheduleReasonDetails = getAppointmentChangeReasonAndNotes(
    formData,
    "reschedule_reason",
    "reschedule_notes",
  );
  const reschedule_reason = parseAppointmentChangeReason(
    formData,
    "reschedule_reason",
    "reschedule_notes",
  );
  if (!id || !start_at_raw || !reschedule_reason || !rescheduleReasonDetails) redirect(`${BASE}/appointments?error=missing`);

  const before = await prisma.therapy_appointments.findFirst({
    where: { id, household_id: householdId },
    include: APPOINTMENT_AUDIT_INCLUDE,
  });
  if (!before) redirect(`${BASE}/appointments?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, before.job_id))) {
    redirect(`${BASE}/appointments?error=job`);
  }

  const start_at = new Date(start_at_raw);
  if (Number.isNaN(start_at.getTime())) redirect(`${BASE}/appointments?error=date`);
  const end_at = parseDate((formData.get("end_at") as string) || null);

  await prisma.therapy_appointments.updateMany({
    where: { id, household_id: householdId },
    data: { start_at, end_at, reschedule_reason },
  });

  const after = await prisma.therapy_appointments.findFirst({
    where: { id, household_id: householdId },
    include: APPOINTMENT_AUDIT_INCLUDE,
  });
  if (after) {
    await logTherapyAppointmentAudit({
      householdId,
      userId,
      appointmentId: id,
      action: TherapyAppointmentAuditAction.reschedule,
      metadata: {
        before: appointmentToSnapshot(before),
        after: appointmentToSnapshot(after),
        reason: rescheduleReasonDetails.reason,
        notes: rescheduleReasonDetails.notes,
      },
    });
  }

  revalidatePath(`${BASE}/appointments`);
  revalidatePath(`${BASE}/reports`);
  appointmentsSuccessRedirect(formData, `${BASE}/appointments?updated=1`);
}

export async function updateTherapyAppointment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/");
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  const client_id = (formData.get("client_id") as string)?.trim() || "";
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const program_id = (formData.get("program_id") as string)?.trim() || "";
  const visit_type = parseVisitType((formData.get("visit_type") as string)?.trim() || null);
  const status = parseAppointmentStatus((formData.get("status") as string)?.trim() || null);
  const additionalClientIds = parseUniqueIds(formData.getAll("additional_client_ids"));
  if (!id || !client_id || !job_id || !visit_type || !status) {
    redirect(`${BASE}/appointments?error=missing`);
  }

  const before = await prisma.therapy_appointments.findFirst({
    where: { id, household_id: householdId },
    include: APPOINTMENT_AUDIT_INCLUDE,
  });
  if (!before) redirect(`${BASE}/appointments?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, before.job_id))) {
    redirect(`${BASE}/appointments?error=job`);
  }
  if (!(await assertClientForCurrentUserScope(householdId, userFm, client_id))) {
    redirect(`${BASE}/appointments?error=client`);
  }
  for (const participantId of additionalClientIds) {
    if (!(await assertClientForCurrentUserScope(householdId, userFm, participantId))) {
      redirect(`${BASE}/appointments?error=client`);
    }
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) redirect(`${BASE}/appointments?error=job`);

  let programIdOrNull: string | null = program_id || null;
  if (programIdOrNull) {
    const p = await assertProgram(householdId, programIdOrNull);
    if (!p || p.job_id !== job_id) programIdOrNull = null;
  }

  const primaryClient = await prisma.therapy_clients.findFirst({
    where: { id: client_id, household_id: householdId },
    select: { family_id: true },
  });

  await prisma.therapy_appointments.updateMany({
    where: { id, household_id: householdId },
    data: {
      client_id,
      family_id: primaryClient?.family_id ?? null,
      job_id,
      program_id: programIdOrNull,
      visit_type,
      status,
      end_at: parseDate((formData.get("end_at") as string) || null),
      cancellation_reason:
        status === "cancelled"
          ? (formData.get("cancellation_reason") as string | null)?.trim() || null
          : null,
    },
  });
  await syncAppointmentParticipants({
    householdId,
    appointmentId: id,
    primaryClientId: client_id,
    participantIdsRaw: additionalClientIds,
  });

  const after = await prisma.therapy_appointments.findFirst({
    where: { id, household_id: householdId },
    include: APPOINTMENT_AUDIT_INCLUDE,
  });
  if (after) {
    await logTherapyAppointmentAudit({
      householdId,
      userId,
      appointmentId: id,
      action: TherapyAppointmentAuditAction.update,
      metadata: {
        before: appointmentToSnapshot(before),
        after: appointmentToSnapshot(after),
      },
    });
  }

  revalidatePath(`${BASE}/appointments`);
  revalidatePath(`${BASE}/reports`);
  appointmentsSuccessRedirect(formData, `${BASE}/appointments?updated=1`);
}

export async function reportTreatmentFromAppointment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const appointmentId = (formData.get("appointment_id") as string | null)?.trim() || "";
  if (!appointmentId) redirect(`${BASE}/appointments?error=missing`);
  const appointment = await prisma.therapy_appointments.findFirst({
    where: { id: appointmentId, household_id: householdId },
    include: {
      participants: true,
    },
  });
  if (!appointment) redirect(`${BASE}/appointments?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, appointment.job_id))) {
    redirect(`${BASE}/appointments?error=job`);
  }
  const amountStr = parseMoney(formData.get("amount") as string);
  if (!amountStr) redirect(`${BASE}/appointments/${appointmentId}/edit?error=amount`);

  const treatmentId = crypto.randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.therapy_treatments.create({
      data: {
        id: treatmentId,
        household_id: householdId,
        client_id: appointment.client_id,
        family_id: appointment.family_id,
        job_id: appointment.job_id,
        program_id: appointment.program_id,
        occurred_at: appointment.start_at,
        amount: amountStr,
        currency: (formData.get("currency") as string | null)?.trim() || "ILS",
        visit_type: appointment.visit_type,
        note_1: (formData.get("note_1") as string | null)?.trim() || null,
        note_2: (formData.get("note_2") as string | null)?.trim() || null,
        note_3: (formData.get("note_3") as string | null)?.trim() || null,
      },
    });
    const participantIds = new Set<string>([
      appointment.client_id,
      ...appointment.participants.map((p) => p.client_id),
      ...parseUniqueIds(formData.getAll("additional_participant_ids")),
    ]);
    for (const clientId of participantIds) {
      await tx.therapy_treatment_participants.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          treatment_id: treatmentId,
          client_id: clientId,
        },
      });
    }
    await tx.therapy_appointments.update({
      where: { id: appointmentId },
      data: { treatment_id: treatmentId, status: "completed" },
    });
  });

  revalidatePath(`${BASE}/appointments`);
  revalidatePath(`${BASE}/treatments`);
  redirect(`${BASE}/appointments/${appointmentId}/edit?saved=1`);
}

export async function createTherapyAppointmentSeries(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/");
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const client_id = (formData.get("client_id") as string)?.trim() || "";
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const program_id = (formData.get("program_id") as string)?.trim() || "";
  const visit_type = parseVisitType((formData.get("visit_type") as string)?.trim() || null);
  const recurrence = parseSeriesRecurrence((formData.get("recurrence") as string)?.trim() || null);
  const day_of_week = Number(formData.get("day_of_week") || 0);
  const time_of_day_raw = (formData.get("time_of_day") as string)?.trim() || "";
  const start_date = parseDateRequired((formData.get("start_date") as string) || null);

  if (!client_id || !job_id || !visit_type || !recurrence || !time_of_day_raw || !start_date) {
    redirect(`${BASE}/appointments?error=missing`);
  }

  if (!(await assertClientForCurrentUserScope(householdId, userFm, client_id))) {
    redirect(`${BASE}/appointments?error=client`);
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) redirect(`${BASE}/appointments?error=job`);

  const [hh, mm] = time_of_day_raw.split(":").map((x) => parseInt(x, 10));
  const time_of_day = new Date(1970, 0, 1, hh || 0, mm || 0, 0, 0);

  let programIdOrNull: string | null = program_id || null;
  if (programIdOrNull) {
    const p = await assertProgram(householdId, programIdOrNull);
    if (!p || p.job_id !== job_id) programIdOrNull = null;
  }

  const end_date = parseDate((formData.get("end_date") as string) || null);

  const seriesId = crypto.randomUUID();
  await prisma.therapy_appointment_series.create({
    data: {
      id: seriesId,
      household_id: householdId,
      client_id,
      job_id,
      program_id: programIdOrNull,
      visit_type,
      recurrence,
      day_of_week,
      time_of_day,
      start_date,
      end_date,
      is_active: true,
    },
  });

  await materializeSeriesAppointments({ householdId, seriesId, userId });

  revalidatePath(`${BASE}/appointments`);
  revalidatePath(`${BASE}/reports`);
  appointmentsSuccessRedirect(formData, `${BASE}/appointments?series=1`);
}

export async function deleteTherapyAppointmentSeries(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/");
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirect(`${BASE}/appointments?error=id`);
  const series = await prisma.therapy_appointment_series.findFirst({
    where: { id, household_id: householdId },
    select: { job_id: true },
  });
  if (!series) redirect(`${BASE}/appointments?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, series.job_id))) {
    redirect(`${BASE}/appointments?error=job`);
  }

  const appts = await prisma.therapy_appointments.findMany({
    where: { series_id: id, household_id: householdId },
    include: APPOINTMENT_AUDIT_INCLUDE,
  });
  for (const row of appts) {
    await logTherapyAppointmentAudit({
      householdId,
      userId,
      appointmentId: row.id,
      action: TherapyAppointmentAuditAction.delete,
      metadata: {
        snapshot: appointmentToSnapshot(row),
        reason: "series_deleted",
      },
    });
  }

  await prisma.therapy_appointments.deleteMany({
    where: { series_id: id, household_id: householdId },
  });
  await prisma.therapy_appointment_series.deleteMany({
    where: { id, household_id: householdId },
  });
  revalidatePath(`${BASE}/appointments`);
  revalidatePath(`${BASE}/reports`);
  appointmentsSuccessRedirect(formData, `${BASE}/appointments?updated=1`);
}

/** Stop generating future visits; removes future scheduled rows for this series (audited). */
export async function endTherapyRecurringSeries(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/");
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const seriesId = (formData.get("series_id") as string)?.trim() || "";
  if (!seriesId) redirect(`${BASE}/appointments?error=id`);

  const series = await prisma.therapy_appointment_series.findFirst({
    where: { id: seriesId, household_id: householdId },
    select: { job_id: true },
  });
  if (!series) redirect(`${BASE}/appointments?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, series.job_id))) {
    redirect(`${BASE}/appointments?error=job`);
  }

  const now = new Date();
  const future = await prisma.therapy_appointments.findMany({
    where: {
      series_id: seriesId,
      household_id: householdId,
      status: "scheduled",
      start_at: { gte: now },
    },
    include: APPOINTMENT_AUDIT_INCLUDE,
  });

  for (const row of future) {
    await logTherapyAppointmentAudit({
      householdId,
      userId,
      appointmentId: row.id,
      action: TherapyAppointmentAuditAction.delete,
      metadata: {
        snapshot: appointmentToSnapshot(row),
        reason: "recurring_series_ended",
      },
    });
  }

  await prisma.therapy_appointments.deleteMany({
    where: {
      series_id: seriesId,
      household_id: householdId,
      status: "scheduled",
      start_at: { gte: now },
    },
  });

  await prisma.therapy_appointment_series.updateMany({
    where: { id: seriesId, household_id: householdId },
    data: { is_active: false },
  });

  revalidatePath(`${BASE}/appointments`);
  revalidatePath(`${BASE}/reports`);
  appointmentsSuccessRedirect(formData, `${BASE}/appointments?updated=1`);
}

async function resolveTransactionLink(
  householdId: string,
  raw: string | null | undefined,
): Promise<string | null> {
  const id = raw?.trim();
  if (!id) return null;
  const txRow = await prisma.transactions.findFirst({
    where: { id, household_id: householdId },
    select: { id: true },
  });
  return txRow?.id ?? null;
}

async function assertConsultationType(householdId: string, typeId: string) {
  return prisma.therapy_consultation_types.findFirst({
    where: { id: typeId, household_id: householdId },
    select: { id: true },
  });
}

async function assertTreatmentForHousehold(householdId: string, treatmentId: string) {
  return prisma.therapy_treatments.findFirst({
    where: { id: treatmentId, household_id: householdId },
    select: { id: true, job_id: true },
  });
}

// --- Consultation types ---

export async function createTherapyConsultationType(formData: FormData) {
  const { householdId, isSuperAdminContext } = await householdIdForTherapyHouseholdScopedForms(formData);
  const name = (formData.get("name") as string)?.trim() || "";
  const name_he = (formData.get("name_he") as string)?.trim() || null;
  if (!name) redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "error=ctype");

  await prisma.therapy_consultation_types.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      name_he,
      is_system: false,
      sort_order: 200,
    },
  });

  revalidatePath(`${BASE}/consultations`);
  revalidatePath(`${BASE}/settings`);
  if (isSuperAdminContext) {
    revalidatePath(`${ADMIN_HOUSEHOLDS}/${householdId}/edit`);
  }
  redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "saved=ctype");
}

export async function updateTherapyConsultationType(formData: FormData) {
  const { householdId, isSuperAdminContext } = await householdIdForTherapyHouseholdScopedForms(formData);
  const id = (formData.get("id") as string)?.trim() || "";
  const name = (formData.get("name") as string)?.trim() || "";
  const name_he = (formData.get("name_he") as string)?.trim() || null;
  if (!id || !name) redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "error=ctype");

  await prisma.therapy_consultation_types.updateMany({
    where: { id, household_id: householdId },
    data: { name, name_he },
  });

  revalidatePath(`${BASE}/consultations`);
  revalidatePath(`${BASE}/settings`);
  if (isSuperAdminContext) {
    revalidatePath(`${ADMIN_HOUSEHOLDS}/${householdId}/edit`);
  }
  redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "saved=1");
}

export async function deleteTherapyConsultationType(formData: FormData) {
  const { householdId, isSuperAdminContext } = await householdIdForTherapyHouseholdScopedForms(formData);
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "error=ctype");
  const type = await prisma.therapy_consultation_types.findFirst({
    where: { id, household_id: householdId },
    select: { id: true, is_system: true },
  });
  if (!type || type.is_system) redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "error=ctype");

  const usageCount = await prisma.therapy_consultations.count({
    where: { household_id: householdId, consultation_type_id: id },
  });
  if (usageCount > 0) {
    redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "error=ctype-in-use");
  }

  await prisma.therapy_consultation_types.deleteMany({
    where: { id, household_id: householdId, is_system: false },
  });
  revalidatePath(`${BASE}/consultations`);
  revalidatePath(`${BASE}/settings`);
  if (isSuperAdminContext) {
    revalidatePath(`${ADMIN_HOUSEHOLDS}/${householdId}/edit`);
  }
  redirectAfterTherapyHouseholdScopedSave(isSuperAdminContext, householdId, "saved=1");
}

// --- Consultations (meetings) ---

export async function createTherapyConsultation(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const fallbackSuccess = `${BASE}/consultations?created=1`;
  const fallbackError = `${BASE}/consultations`;
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const consultation_type_id = (formData.get("consultation_type_id") as string)?.trim() || "";
  const occurred_at_raw = (formData.get("occurred_at") as string)?.trim() || "";
  if (!job_id || !consultation_type_id || !occurred_at_raw) {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "missing");
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "job");
  }
  if (!(await assertConsultationType(householdId, consultation_type_id))) {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "type");
  }

  const occurred_at = new Date(occurred_at_raw);
  if (Number.isNaN(occurred_at.getTime())) redirectPrivateClinicScoped(formData, "error", fallbackError, "date");

  const incomeStr = parseMoney((formData.get("income_amount") as string) || null);
  const costStr = parseMoney((formData.get("cost_amount") as string) || null);

  const linked_income_transaction_id = await resolveTransactionLink(
    householdId,
    formData.get("linked_income_transaction_id") as string,
  );
  const linked_cost_transaction_id = await resolveTransactionLink(
    householdId,
    formData.get("linked_cost_transaction_id") as string,
  );

  await prisma.therapy_consultations.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      job_id,
      consultation_type_id,
      occurred_at,
      income_amount: incomeStr,
      income_currency: (formData.get("income_currency") as string)?.trim() || "ILS",
      cost_amount: costStr,
      cost_currency: (formData.get("cost_currency") as string)?.trim() || "ILS",
      notes: (formData.get("notes") as string)?.trim() || null,
      linked_income_transaction_id,
      linked_cost_transaction_id,
    },
  });

  revalidatePath(`${BASE}/consultations`);
  redirectPrivateClinicScoped(formData, "success", fallbackSuccess);
}

export async function updateTherapyConsultation(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  const row = await prisma.therapy_consultations.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirect(`${BASE}/consultations?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) redirect(`${BASE}/consultations?error=notfound`);

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const consultation_type_id = (formData.get("consultation_type_id") as string)?.trim() || "";
  const occurred_at_raw = (formData.get("occurred_at") as string)?.trim() || "";
  if (!job_id || !consultation_type_id || !occurred_at_raw) {
    redirect(`${BASE}/consultations?error=missing`);
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) redirect(`${BASE}/consultations?error=job`);
  if (!(await assertConsultationType(householdId, consultation_type_id))) {
    redirect(`${BASE}/consultations?error=type`);
  }

  const occurred_at = new Date(occurred_at_raw);
  if (Number.isNaN(occurred_at.getTime())) redirect(`${BASE}/consultations?error=date`);

  const incomeStr = parseMoney((formData.get("income_amount") as string) || null);
  const costStr = parseMoney((formData.get("cost_amount") as string) || null);

  const linked_income_transaction_id = await resolveTransactionLink(
    householdId,
    formData.get("linked_income_transaction_id") as string,
  );
  const linked_cost_transaction_id = await resolveTransactionLink(
    householdId,
    formData.get("linked_cost_transaction_id") as string,
  );

  await prisma.therapy_consultations.update({
    where: { id },
    data: {
      job_id,
      consultation_type_id,
      occurred_at,
      income_amount: incomeStr ?? null,
      income_currency: (formData.get("income_currency") as string)?.trim() || "ILS",
      cost_amount: costStr ?? null,
      cost_currency: (formData.get("cost_currency") as string)?.trim() || "ILS",
      notes: (formData.get("notes") as string)?.trim() || null,
      linked_income_transaction_id,
      linked_cost_transaction_id,
    },
  });

  revalidatePath(`${BASE}/consultations`);
  redirect(`${BASE}/consultations?updated=1`);
}

export async function deleteTherapyConsultation(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) return;
  const row = await prisma.therapy_consultations.findFirst({
    where: { id, household_id: householdId },
    select: { job_id: true },
  });
  if (!row) return;
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) return;
  await prisma.therapy_consultations.deleteMany({
    where: { id, household_id: householdId },
  });
  revalidatePath(`${BASE}/consultations`);
  redirect(`${BASE}/consultations?updated=1`);
}

// --- Travel ---

export async function createTherapyTravelEntry(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const fallbackSuccess = `${BASE}/travel?created=1`;
  const fallbackError = `${BASE}/travel`;
  const scope = (formData.get("link_scope") as string)?.trim() || "";
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const treatment_id = (formData.get("treatment_id") as string)?.trim() || "";
  const notes = (formData.get("notes") as string)?.trim() || null;
  const amountStr = parseMoney((formData.get("amount") as string) || null);
  const occurredRaw = (formData.get("occurred_at") as string)?.trim() || "";

  let jobId: string | null = null;
  let treatmentId: string | null = null;

  if (scope === "treatment") {
    if (!treatment_id) redirectPrivateClinicScoped(formData, "error", fallbackError, "missing");
    const t = await assertTreatmentForHousehold(householdId, treatment_id);
    if (!t) redirectPrivateClinicScoped(formData, "error", fallbackError, "treatment");
    if (!(await assertJobForCurrentUserScope(householdId, userFm, t.job_id))) {
      redirectPrivateClinicScoped(formData, "error", fallbackError, "job");
    }
    treatmentId = t.id;
  } else if (scope === "job") {
    if (!job_id) redirectPrivateClinicScoped(formData, "error", fallbackError, "missing");
    if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) {
      redirectPrivateClinicScoped(formData, "error", fallbackError, "job");
    }
    jobId = job_id;
  } else {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "scope");
  }

  const occurred_at = occurredRaw ? new Date(occurredRaw) : null;
  if (occurredRaw && occurred_at && Number.isNaN(occurred_at.getTime())) {
    redirectPrivateClinicScoped(formData, "error", fallbackError, "date");
  }

  const linked_transaction_id = await resolveTransactionLink(
    householdId,
    formData.get("linked_transaction_id") as string,
  );

  await prisma.therapy_travel_entries.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      job_id: jobId,
      treatment_id: treatmentId,
      occurred_at,
      notes,
      amount: amountStr,
      currency: (formData.get("currency") as string)?.trim() || "ILS",
      linked_transaction_id,
    },
  });

  revalidatePath(`${BASE}/travel`);
  redirectPrivateClinicScoped(formData, "success", fallbackSuccess);
}

export async function updateTherapyTravelEntry(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  const row = await prisma.therapy_travel_entries.findFirst({
    where: { id, household_id: householdId },
    include: { treatment: { select: { job_id: true } } },
  });
  if (!row) redirect(`${BASE}/travel?error=notfound`);
  const priorJobId = row.treatment_id ? row.treatment?.job_id ?? null : row.job_id;
  if (priorJobId && !(await assertJobForCurrentUserScope(householdId, userFm, priorJobId))) {
    redirect(`${BASE}/travel?error=notfound`);
  }

  const scope = (formData.get("link_scope") as string)?.trim() || "";
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const treatment_id = (formData.get("treatment_id") as string)?.trim() || "";

  let jobId: string | null = null;
  let treatmentId: string | null = null;

  if (scope === "treatment") {
    if (!treatment_id) redirect(`${BASE}/travel?error=missing`);
    const t = await assertTreatmentForHousehold(householdId, treatment_id);
    if (!t) redirect(`${BASE}/travel?error=treatment`);
    if (!(await assertJobForCurrentUserScope(householdId, userFm, t.job_id))) redirect(`${BASE}/travel?error=job`);
    treatmentId = t.id;
  } else {
    if (!job_id) redirect(`${BASE}/travel?error=missing`);
    if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) redirect(`${BASE}/travel?error=job`);
    jobId = job_id;
  }

  const occurredRaw = (formData.get("occurred_at") as string)?.trim() || "";
  const occurred_at = occurredRaw ? new Date(occurredRaw) : null;
  if (occurredRaw && occurred_at && Number.isNaN(occurred_at.getTime())) {
    redirect(`${BASE}/travel?error=date`);
  }

  const amountStr = parseMoney((formData.get("amount") as string) || null);
  const linked_transaction_id = await resolveTransactionLink(
    householdId,
    formData.get("linked_transaction_id") as string,
  );

  await prisma.therapy_travel_entries.update({
    where: { id },
    data: {
      job_id: jobId,
      treatment_id: treatmentId,
      occurred_at,
      notes: (formData.get("notes") as string)?.trim() || null,
      amount: amountStr ?? null,
      currency: (formData.get("currency") as string)?.trim() || "ILS",
      linked_transaction_id,
    },
  });

  revalidatePath(`${BASE}/travel`);
  redirect(`${BASE}/travel?updated=1`);
}

export async function deleteTherapyTravelEntry(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) return;
  const row = await prisma.therapy_travel_entries.findFirst({
    where: { id, household_id: householdId },
    include: { treatment: { select: { job_id: true } } },
  });
  if (!row) return;
  const priorJobId = row.treatment_id ? row.treatment?.job_id ?? null : row.job_id;
  if (priorJobId && !(await assertJobForCurrentUserScope(householdId, userFm, priorJobId))) return;
  await prisma.therapy_travel_entries.deleteMany({
    where: { id, household_id: householdId },
  });
  revalidatePath(`${BASE}/travel`);
  redirect(`${BASE}/travel?updated=1`);
}

// --- Petrol: minimal vehicle CRUD (no full Cars module) ---

export async function createPrivateClinicPetrolVehicle(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const redirectOnError =
    (formData.get("redirect_on_error") as string)?.trim() || `${BASE}/petrol`;
  const maker = (formData.get("maker") as string)?.trim();
  const model = (formData.get("model") as string)?.trim();
  const custom_name = (formData.get("custom_name") as string)?.trim() || null;
  const plate_number = (formData.get("plate_number") as string)?.trim() || null;
  if (!maker || !model) {
    const sep = redirectOnError.includes("?") ? "&" : "?";
    redirect(
      `${redirectOnError}${sep}error=${encodeURIComponent("Maker and model are required.")}`,
    );
  }

  const car = await prisma.cars.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      maker,
      model,
      custom_name,
      plate_number,
    },
  });

  revalidatePath(`${BASE}/petrol`);
  revalidatePath("/dashboard/cars");
  revalidatePath("/");
  redirect(`${BASE}/petrol?carId=${encodeURIComponent(car.id)}&vehicleSaved=1`);
}

export async function updatePrivateClinicPetrolVehicle(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const car_id = (formData.get("car_id") as string)?.trim() || "";
  if (!car_id || !(await validateCarInHousehold(householdId, car_id))) {
    redirect(`${BASE}/petrol?error=${encodeURIComponent("Invalid vehicle.")}`);
  }

  const maker = (formData.get("maker") as string)?.trim();
  const model = (formData.get("model") as string)?.trim();
  const custom_name = (formData.get("custom_name") as string)?.trim() || null;
  const plate_number = (formData.get("plate_number") as string)?.trim() || null;
  if (!maker || !model) {
    redirect(
      `${BASE}/petrol?carId=${encodeURIComponent(car_id)}&error=${encodeURIComponent("Maker and model are required.")}`,
    );
  }

  await prisma.cars.update({
    where: { id: car_id, household_id: householdId },
    data: { maker, model, custom_name, plate_number },
  });

  revalidatePath(`${BASE}/petrol`);
  revalidatePath("/dashboard/cars");
  revalidatePath("/");
  redirect(`${BASE}/petrol?carId=${encodeURIComponent(car_id)}&vehicleUpdated=1`);
}

export async function deletePrivateClinicPetrolVehicle(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const car_id = (formData.get("car_id") as string)?.trim() || "";
  if (!car_id || !(await validateCarInHousehold(householdId, car_id))) {
    redirect(`${BASE}/petrol?error=${encodeURIComponent("Invalid vehicle.")}`);
  }

  await prisma.cars.update({
    where: { id: car_id, household_id: householdId },
    data: { is_active: false },
  });

  revalidatePath(`${BASE}/petrol`);
  revalidatePath("/dashboard/cars");
  revalidatePath("/");
  redirect(`${BASE}/petrol?vehicleDeleted=1`);
}
