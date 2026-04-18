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
import { parseTherapyOccurredAtFromForm } from "@/lib/therapy/occurred-at-form";
import { isEligiblePetrolTankerOnFillDate } from "@/lib/family-member-age";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PRIVATE_CLINIC_NAV_ITEMS } from "@/lib/private-clinic-nav";
import type {
  TherapyAppointmentRecurrence,
  TherapyAppointmentStatus,
  TherapyReceiptPaymentMethod,
  TherapyReceiptRecipientType,
  TherapyTreatmentPaymentMethod,
  TherapyVisitType,
} from "@/generated/prisma/enums";

const BASE = "/dashboard/private-clinic";
const ADMIN_HOUSEHOLDS = "/admin/households";
const CLIENT_STATUS_OPTIONS = new Set([
  "none",
  "exists",
  "filed_in_hospitalization",
  "filed_recognized",
  "filed_rejected",
  "filed_appeal",
  "filed_worsening",
]);

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

function parseVisitCount(raw: string | null | undefined): number | null {
  const n = Number((raw ?? "").trim());
  if (!Number.isFinite(n)) return null;
  const int = Math.trunc(n);
  if (int < 1 || int > 14) return null;
  return int;
}

function parseVisitWeeks(raw: string | null | undefined): number | null {
  const n = Number((raw ?? "").trim());
  if (!Number.isFinite(n)) return null;
  const int = Math.trunc(n);
  if (int < 1 || int > 12) return null;
  return int;
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

function parseTreatmentPaymentMethod(raw: string | null | undefined): TherapyTreatmentPaymentMethod | null {
  if (raw === "bank_transfer" || raw === "digital_payment") return raw;
  return null;
}

async function resolveTherapyTreatmentPaymentFields(
  householdId: string,
  formData: FormData,
): Promise<{
  payment_date: Date | null;
  payment_method: TherapyTreatmentPaymentMethod | null;
  payment_bank_account_id: string | null;
  payment_digital_payment_method_id: string | null;
}> {
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

function parseAppointmentStatus(raw: string | null | undefined): TherapyAppointmentStatus | null {
  if (raw === "scheduled" || raw === "cancelled" || raw === "completed") return raw;
  return null;
}

function parseSeriesRecurrence(raw: string | null | undefined): TherapyAppointmentRecurrence | null {
  if (raw === "weekly" || raw === "biweekly") return raw;
  return null;
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

  const note_1_label = (formData.get("note_1_label") as string | null)?.trim() || "Note 1";
  const note_2_label = (formData.get("note_2_label") as string | null)?.trim() || "Note 2";
  const note_3_label = (formData.get("note_3_label") as string | null)?.trim() || "Note 3";
  const note_1_label_he = trimOptionalNoteHe(formData.get("note_1_label_he") as string | null);
  const note_2_label_he = trimOptionalNoteHe(formData.get("note_2_label_he") as string | null);
  const note_3_label_he = trimOptionalNoteHe(formData.get("note_3_label_he") as string | null);

  await prisma.therapy_settings.update({
    where: { household_id: householdId },
    data: {
      note_1_label,
      note_2_label,
      note_3_label,
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

  const note_1_label = (formData.get("note_1_label") as string)?.trim() || "Note 1";
  const note_2_label = (formData.get("note_2_label") as string)?.trim() || "Note 2";
  const note_3_label = (formData.get("note_3_label") as string)?.trim() || "Note 3";
  const note_1_label_he = trimOptionalNoteHe(formData.get("note_1_label_he") as string | null);
  const note_2_label_he = trimOptionalNoteHe(formData.get("note_2_label_he") as string | null);
  const note_3_label_he = trimOptionalNoteHe(formData.get("note_3_label_he") as string | null);

  await prisma.therapy_settings.update({
    where: { household_id: householdId },
    data: {
      note_1_label,
      note_2_label,
      note_3_label,
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
    redirect(`${BASE}/jobs?error=${resolvedFm.code}`);
  }
  const { family_member_id } = resolvedFm;

  const employment_type = parseEmploymentType((formData.get("employment_type") as string)?.trim() || null);
  const start_date_raw = (formData.get("start_date") as string)?.trim() || "";
  const end_date_raw = (formData.get("end_date") as string)?.trim() || "";
  const job_title = (formData.get("job_title") as string)?.trim() || "";

  if (!employment_type || !start_date_raw || !job_title) {
    redirect(`${BASE}/jobs?error=missing`);
  }
  const start_date = parseDate(start_date_raw);
  const end_date = parseDate(end_date_raw || null);
  if (!start_date) redirect(`${BASE}/jobs?error=start`);
  if (end_date_raw && !end_date) redirect(`${BASE}/jobs?error=end`);
  if (end_date && end_date < start_date) redirect(`${BASE}/jobs?error=range`);

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
      employer_tax_number: (formData.get("employer_tax_number") as string)?.trim() || null,
      employer_address: (formData.get("employer_address") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
      is_active: formData.has("is_active"),
      is_private_clinic: formData.has("is_private_clinic"),
    },
  });

  revalidatePath(`${BASE}/jobs`);
  revalidatePath(`${BASE}/programs`);
  redirect(`${BASE}/jobs?created=1`);
}

export async function updateTherapyJob(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);

  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirect(`${BASE}/jobs?error=id`);

  const row = await prisma.jobs.findFirst({
    where: userFm
      ? { id, household_id: householdId, family_member_id: userFm }
      : { id, household_id: householdId },
    select: { id: true },
  });
  if (!row) redirect(`${BASE}/jobs?error=notfound`);

  const employment_type = parseEmploymentType((formData.get("employment_type") as string)?.trim() || null);
  const start_date_raw = (formData.get("start_date") as string)?.trim() || "";
  const end_date_raw = (formData.get("end_date") as string)?.trim() || "";
  const job_title = (formData.get("job_title") as string)?.trim() || "";

  if (!employment_type || !start_date_raw || !job_title) {
    redirect(`${BASE}/jobs?error=missing`);
  }
  const start_date = parseDate(start_date_raw);
  const end_date = parseDate(end_date_raw || null);
  if (!start_date) redirect(`${BASE}/jobs?error=start`);
  if (end_date_raw && !end_date) redirect(`${BASE}/jobs?error=end`);
  if (end_date && end_date < start_date) redirect(`${BASE}/jobs?error=range`);

  await prisma.jobs.update({
    where: { id },
    data: {
      employment_type,
      start_date,
      end_date,
      job_title,
      employer_name: (formData.get("employer_name") as string)?.trim() || null,
      employer_tax_number: (formData.get("employer_tax_number") as string)?.trim() || null,
      employer_address: (formData.get("employer_address") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
      is_active: formData.has("is_active"),
      is_private_clinic: formData.has("is_private_clinic"),
    },
  });

  revalidatePath(`${BASE}/jobs`);
  revalidatePath(`${BASE}/programs`);
  redirect(`${BASE}/jobs?updated=1`);
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
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const name = (formData.get("name") as string)?.trim() || "";
  if (!job_id || !name) redirect(`${BASE}/programs?error=missing`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) redirect(`${BASE}/programs?error=job`);

  await prisma.therapy_service_programs.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      job_id,
      name,
      description: (formData.get("description") as string)?.trim() || null,
      sort_order: Number(formData.get("sort_order") || 0) || 0,
      is_active: formData.has("is_active"),
    },
  });

  revalidatePath(`${BASE}/programs`);
  redirect(`${BASE}/programs?created=1`);
}

export async function updateTherapyProgram(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirect(`${BASE}/programs?error=id`);
  const row = await prisma.therapy_service_programs.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirect(`${BASE}/programs?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) redirect(`${BASE}/programs?error=job`);

  await prisma.therapy_service_programs.update({
    where: { id },
    data: {
      name: (formData.get("name") as string)?.trim() || row.name,
      description: (formData.get("description") as string)?.trim() || null,
      sort_order: Number(formData.get("sort_order") || row.sort_order) || 0,
      is_active: formData.has("is_active"),
    },
  });

  revalidatePath(`${BASE}/programs`);
  redirect(`${BASE}/programs?updated=1`);
}

export async function deleteTherapyProgram(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirect(`${BASE}/programs?error=id`);
  const row = await prisma.therapy_service_programs.findFirst({
    where: { id, household_id: householdId },
    select: { job_id: true },
  });
  if (!row) redirect(`${BASE}/programs?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFm, row.job_id))) redirect(`${BASE}/programs?error=job`);
  await prisma.therapy_service_programs.deleteMany({
    where: { id, household_id: householdId },
  });
  revalidatePath(`${BASE}/programs`);
  redirect(`${BASE}/programs?updated=1`);
}

const THERAPY_VISIT_TYPES: TherapyVisitType[] = ["clinic", "home", "phone", "video"];

export async function saveTherapyJobVisitTypeDefaults(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  if (!job_id) redirect(`${BASE}/jobs?error=missing`);
  if (!(await assertJobForCurrentUserScope(householdId, userFamilyMemberId, job_id))) {
    redirect(`${BASE}/jobs?error=job`);
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
  revalidatePath(`${BASE}/treatments`);
  redirect(`${BASE}/jobs?updated=1`);
}

export async function saveTherapyProgramVisitTypeDefaults(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const program_id = (formData.get("program_id") as string)?.trim() || "";
  if (!program_id) redirect(`${BASE}/programs?error=missing`);

  const prog = await assertProgram(householdId, program_id);
  if (!prog) redirect(`${BASE}/programs?error=notfound`);
  if (!(await assertJobForCurrentUserScope(householdId, userFamilyMemberId, prog.job_id))) {
    redirect(`${BASE}/programs?error=job`);
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
  revalidatePath(`${BASE}/treatments`);
  redirect(`${BASE}/programs?updated=1`);
}

// --- Clients ---

export async function createTherapyClient(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFamilyMemberId = await getCurrentUserFamilyMemberId(householdId);
  const fallbackErrorPath = `${BASE}/clients/new`;
  const first_name = (formData.get("first_name") as string)?.trim() || "";
  const default_job_id = (formData.get("default_job_id") as string)?.trim() || "";
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

  const jobIdsRaw = formData.getAll("job_ids") as string[];
  const jobIds = [...new Set(jobIdsRaw.map((s) => String(s).trim()).filter(Boolean))];
  if (!jobIds.includes(default_job_id)) jobIds.push(default_job_id);
  const allowedJobIds = await jobIdsForCurrentUserScope(householdId, userFamilyMemberId);

  const id = crypto.randomUUID();
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
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) {
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

  const payment = await resolveTherapyTreatmentPaymentFields(householdId, formData);

  const createdTreatment = await prisma.therapy_treatments.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      client_id,
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
    },
  });

  const inlineReceiptNumber = (formData.get("receipt_number") as string)?.trim() || "";
  const inlineReceiptIssuedAt = parseDateRequired((formData.get("receipt_issued_at") as string)?.trim() || null);
  if (inlineReceiptNumber && inlineReceiptIssuedAt) {
    const receiptId = crypto.randomUUID();
    await prisma.therapy_receipts.create({
      data: {
        id: receiptId,
        household_id: householdId,
        job_id,
        receipt_number: inlineReceiptNumber,
        issued_at: inlineReceiptIssuedAt,
        total_amount: amountStr,
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

  const payment = await resolveTherapyTreatmentPaymentFields(householdId, formData);

  await prisma.therapy_treatments.update({
    where: { id },
    data: {
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
  const recipient_type = parseRecipientType((formData.get("recipient_type") as string)?.trim() || null);
  const payment_method = parseReceiptPaymentMethod((formData.get("payment_method") as string)?.trim() || null);
  const covered_period_start = parseDate((formData.get("covered_period_start") as string)?.trim() || null);
  const covered_period_end = parseDate((formData.get("covered_period_end") as string)?.trim() || null);

  if (!job_id || !receipt_number || !issued_at || !totalStr || !recipient_type || !payment_method) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
  }
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

  const id = crypto.randomUUID();
  await prisma.therapy_receipts.create({
    data: {
      id,
      household_id: householdId,
      job_id,
      receipt_number,
      issued_at,
      total_amount: totalStr,
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
  if (!job_id || !issued_at || !totalStr) redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
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
  if (!recipient_type || !payment_method) redirectPrivateClinicScoped(formData, "error", fallbackPath, "badenum");

  await prisma.therapy_receipts.update({
    where: { id },
    data: {
      job_id,
      receipt_number: (formData.get("receipt_number") as string)?.trim() || row.receipt_number,
      issued_at,
      total_amount: totalStr,
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
  if (!treatmentIds.length || !receiptNumber || !issuedAt || !totalStr) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "missing");
  }
  const treatments = await prisma.therapy_treatments.findMany({
    where: { household_id: householdId, id: { in: treatmentIds } },
    select: { id: true, job_id: true, amount: true, currency: true },
  });
  if (treatments.length !== treatmentIds.length) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "notfound");
  }
  const jobId = treatments[0]!.job_id;
  if (treatments.some((t) => t.job_id !== jobId)) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, jobId))) {
    redirectPrivateClinicScoped(formData, "error", fallbackPath, "job");
  }
  const receiptId = crypto.randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.therapy_receipts.create({
      data: {
        id: receiptId,
        household_id: householdId,
        job_id: jobId,
        receipt_number: receiptNumber,
        issued_at: issuedAt,
        total_amount: totalStr,
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
    select: { id: true, job_id: true },
  });
  if (!receipt) return;
  if (!(await assertJobForCurrentUserScope(householdId, userFm, receipt.job_id))) return;
  const treatments = await prisma.therapy_treatments.findMany({
    where: { household_id: householdId, id: { in: treatmentIds }, job_id: receipt.job_id },
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

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const category_id = (formData.get("category_id") as string)?.trim() || "";
  const expense_date = parseDateRequired((formData.get("expense_date") as string) || null);
  const amountStr = parseMoney(formData.get("amount") as string);
  if (!job_id || !category_id || !expense_date || !amountStr) {
    redirect(`${BASE}/expenses?error=missing`);
  }
  if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) redirect(`${BASE}/expenses?error=job`);

  const cat = await prisma.therapy_expense_categories.findFirst({
    where: { id: category_id, household_id: householdId },
  });
  if (!cat) redirect(`${BASE}/expenses?error=cat`);

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
  redirect(`${BASE}/expenses?created=1`);
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

export async function createTherapyAppointment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
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

  await prisma.therapy_appointments.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      client_id,
      job_id,
      program_id: programIdOrNull,
      visit_type,
      start_at,
      end_at: parseDate((formData.get("end_at") as string) || null),
      status: "scheduled",
    },
  });

  revalidatePath(`${BASE}/appointments`);
  redirect(`${BASE}/appointments?created=1`);
}

export async function updateTherapyAppointmentStatus(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string)?.trim() || "";
  const status = parseAppointmentStatus((formData.get("status") as string)?.trim() || null);
  if (!id || !status) return;

  const apt = await prisma.therapy_appointments.findFirst({
    where: { id, household_id: householdId },
    select: { job_id: true },
  });
  if (!apt) return;
  if (!(await assertJobForCurrentUserScope(householdId, userFm, apt.job_id))) return;

  await prisma.therapy_appointments.updateMany({
    where: { id, household_id: householdId },
    data: { status },
  });

  revalidatePath(`${BASE}/appointments`);
}

export async function createTherapyAppointmentSeries(formData: FormData) {
  const householdId = await householdIdOrRedirect();
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

  await materializeSeriesAppointments({ householdId, seriesId });

  revalidatePath(`${BASE}/appointments`);
  redirect(`${BASE}/appointments?series=1`);
}

export async function deleteTherapyAppointmentSeries(formData: FormData) {
  const householdId = await householdIdOrRedirect();
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
  await prisma.therapy_appointments.deleteMany({
    where: { series_id: id, household_id: householdId },
  });
  await prisma.therapy_appointment_series.deleteMany({
    where: { id, household_id: householdId },
  });
  revalidatePath(`${BASE}/appointments`);
  redirect(`${BASE}/appointments?updated=1`);
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
  redirect(`${BASE}/consultations?created=1`);
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
  const scope = (formData.get("link_scope") as string)?.trim() || "";
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const treatment_id = (formData.get("treatment_id") as string)?.trim() || "";
  const notes = (formData.get("notes") as string)?.trim() || null;
  const amountStr = parseMoney((formData.get("amount") as string) || null);
  const occurredRaw = (formData.get("occurred_at") as string)?.trim() || "";

  let jobId: string | null = null;
  let treatmentId: string | null = null;

  if (scope === "treatment") {
    if (!treatment_id) redirect(`${BASE}/travel?error=missing`);
    const t = await assertTreatmentForHousehold(householdId, treatment_id);
    if (!t) redirect(`${BASE}/travel?error=treatment`);
    if (!(await assertJobForCurrentUserScope(householdId, userFm, t.job_id))) redirect(`${BASE}/travel?error=job`);
    treatmentId = t.id;
  } else if (scope === "job") {
    if (!job_id) redirect(`${BASE}/travel?error=missing`);
    if (!(await assertJobForCurrentUserScope(householdId, userFm, job_id))) redirect(`${BASE}/travel?error=job`);
    jobId = job_id;
  } else {
    redirect(`${BASE}/travel?error=scope`);
  }

  const occurred_at = occurredRaw ? new Date(occurredRaw) : null;
  if (occurredRaw && occurred_at && Number.isNaN(occurred_at.getTime())) {
    redirect(`${BASE}/travel?error=date`);
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
  redirect(`${BASE}/travel?created=1`);
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
