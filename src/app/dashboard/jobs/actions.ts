"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type EmploymentType = "freelancer" | "employee" | "self_employed" | "contractor_via_company";
type PayrollPeriodType = "monthly" | "biweekly" | "weekly" | "annual" | "other";

function parseDateInput(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMoney(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

async function validateFamilyMember(householdId: string, familyMemberId: string) {
  const member = await prisma.family_members.findFirst({
    where: { id: familyMemberId, household_id: householdId },
    select: { id: true },
  });
  return !!member;
}

async function validateJobBelongsToHousehold(householdId: string, jobId: string) {
  const job = await prisma.jobs.findFirst({
    where: { id: jobId, household_id: householdId },
    select: { id: true },
  });
  return !!job;
}

async function validateBankAccountForHousehold(householdId: string, bankAccountId: string | null) {
  if (!bankAccountId) return null;
  const row = await prisma.bank_accounts.findFirst({
    where: { id: bankAccountId, household_id: householdId },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function validateCreditCardForHousehold(householdId: string, creditCardId: string | null) {
  if (!creditCardId) return null;
  const row = await prisma.credit_cards.findFirst({
    where: { id: creditCardId, household_id: householdId },
    select: { id: true },
  });
  return row?.id ?? null;
}

function parseOptionalLinkedId(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  return v ? v : null;
}

function parseEmploymentType(raw: string | null): EmploymentType | null {
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

function parsePeriodType(raw: string | null): PayrollPeriodType {
  if (raw === "monthly" || raw === "biweekly" || raw === "weekly" || raw === "annual" || raw === "other") {
    return raw;
  }
  return "monthly";
}

export async function createJob(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/jobs?error=No+household");

  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || "";
  const employment_type = parseEmploymentType((formData.get("employment_type") as string | null)?.trim() || null);
  const start_date_raw = (formData.get("start_date") as string | null)?.trim() || null;
  const end_date_raw = (formData.get("end_date") as string | null)?.trim() || null;
  const job_title = (formData.get("job_title") as string | null)?.trim() || "";

  const employer_name = (formData.get("employer_name") as string | null)?.trim() || null;
  const employer_tax_number = (formData.get("employer_tax_number") as string | null)?.trim() || null;
  const employer_address = (formData.get("employer_address") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const is_active = formData.get("is_active") !== "off";
  const is_private_clinic = formData.has("is_private_clinic");
  const bank_account_id_raw = parseOptionalLinkedId(formData.get("bank_account_id") as string | null);
  const credit_card_id_raw = parseOptionalLinkedId(formData.get("credit_card_id") as string | null);

  if (!family_member_id || !employment_type || !job_title || !start_date_raw) {
    redirect("/dashboard/jobs?error=Required+fields+missing");
  }
  if (!(await validateFamilyMember(householdId, family_member_id))) {
    redirect("/dashboard/jobs?error=Invalid+family+member");
  }

  const start_date = parseDateInput(start_date_raw);
  const end_date = parseDateInput(end_date_raw);
  if (!start_date) redirect("/dashboard/jobs?error=Invalid+start+date");
  if (end_date_raw && !end_date) redirect("/dashboard/jobs?error=Invalid+end+date");
  if (start_date && end_date && end_date < start_date) {
    redirect("/dashboard/jobs?error=End+date+must+be+after+start+date");
  }

  const bank_account_id = await validateBankAccountForHousehold(householdId, bank_account_id_raw);
  const credit_card_id = await validateCreditCardForHousehold(householdId, credit_card_id_raw);
  if (bank_account_id_raw && !bank_account_id) {
    redirect("/dashboard/jobs?error=Invalid+bank+account");
  }
  if (credit_card_id_raw && !credit_card_id) {
    redirect("/dashboard/jobs?error=Invalid+credit+card");
  }

  await prisma.jobs.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      family_member_id,
      employment_type,
      start_date,
      end_date,
      job_title,
      employer_name,
      employer_tax_number,
      employer_address,
      notes,
      is_active,
      is_private_clinic,
      bank_account_id,
      credit_card_id,
    },
  });

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/private-clinic", "layout");
  redirect("/dashboard/jobs?created=1");
}

export async function updateJob(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/jobs?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/jobs?error=Missing+id");
  if (!(await validateJobBelongsToHousehold(householdId, id))) {
    redirect("/dashboard/jobs?error=Job+not+found");
  }

  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || "";
  const employment_type = parseEmploymentType((formData.get("employment_type") as string | null)?.trim() || null);
  const start_date_raw = (formData.get("start_date") as string | null)?.trim() || null;
  const end_date_raw = (formData.get("end_date") as string | null)?.trim() || null;
  const job_title = (formData.get("job_title") as string | null)?.trim() || "";
  const employer_name = (formData.get("employer_name") as string | null)?.trim() || null;
  const employer_tax_number = (formData.get("employer_tax_number") as string | null)?.trim() || null;
  const employer_address = (formData.get("employer_address") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const is_active = formData.get("is_active") !== "off";
  const is_private_clinic = formData.has("is_private_clinic");
  const bank_account_id_raw = parseOptionalLinkedId(formData.get("bank_account_id") as string | null);
  const credit_card_id_raw = parseOptionalLinkedId(formData.get("credit_card_id") as string | null);

  if (!family_member_id || !employment_type || !job_title || !start_date_raw) {
    redirect(`/dashboard/jobs/${id}?error=Required+fields+missing`);
  }
  if (!(await validateFamilyMember(householdId, family_member_id))) {
    redirect(`/dashboard/jobs/${id}?error=Invalid+family+member`);
  }

  const start_date = parseDateInput(start_date_raw);
  const end_date = parseDateInput(end_date_raw);
  if (!start_date) redirect(`/dashboard/jobs/${id}?error=Invalid+start+date`);
  if (end_date_raw && !end_date) redirect(`/dashboard/jobs/${id}?error=Invalid+end+date`);
  if (start_date && end_date && end_date < start_date) {
    redirect(`/dashboard/jobs/${id}?error=End+date+must+be+after+start+date`);
  }

  const bank_account_id = await validateBankAccountForHousehold(householdId, bank_account_id_raw);
  const credit_card_id = await validateCreditCardForHousehold(householdId, credit_card_id_raw);
  if (bank_account_id_raw && !bank_account_id) {
    redirect(`/dashboard/jobs/${id}?error=Invalid+bank+account`);
  }
  if (credit_card_id_raw && !credit_card_id) {
    redirect(`/dashboard/jobs/${id}?error=Invalid+credit+card`);
  }

  await prisma.jobs.updateMany({
    where: { id, household_id: householdId },
    data: {
      family_member_id,
      employment_type,
      start_date,
      end_date,
      job_title,
      employer_name,
      employer_tax_number,
      employer_address,
      notes,
      is_active,
      is_private_clinic,
      bank_account_id,
      credit_card_id,
    },
  });

  revalidatePath("/dashboard/jobs");
  revalidatePath(`/dashboard/jobs/${id}`);
  revalidatePath("/dashboard/private-clinic", "layout");
  redirect("/dashboard/jobs?updated=1");
}

export async function createJobBenefit(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const job_id = (formData.get("job_id") as string | null)?.trim() || "";
  const benefit_type = (formData.get("benefit_type") as string | null)?.trim() || "";
  if (!job_id || !benefit_type) return;
  if (!(await validateJobBelongsToHousehold(householdId, job_id))) return;

  await prisma.job_benefits.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      job_id,
      benefit_type,
      transfer_destination: (formData.get("transfer_destination") as string | null)?.trim() || null,
      provider_name: (formData.get("provider_name") as string | null)?.trim() || null,
      policy_number: (formData.get("policy_number") as string | null)?.trim() || null,
      terms: (formData.get("terms") as string | null)?.trim() || null,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/jobs/${job_id}`);
}

export async function deleteJobBenefit(id: string, jobId: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  await prisma.job_benefits.deleteMany({
    where: { id, job_id: jobId, household_id: householdId },
  });

  revalidatePath(`/dashboard/jobs/${jobId}`);
}

export async function createJobPayrollEntry(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const job_id = (formData.get("job_id") as string | null)?.trim() || "";
  const effective_date_raw = (formData.get("effective_date") as string | null)?.trim() || null;
  if (!job_id || !effective_date_raw) return;
  if (!(await validateJobBelongsToHousehold(householdId, job_id))) return;

  const effective_date = parseDateInput(effective_date_raw);
  if (!effective_date) return;
  const pay_period_start = parseDateInput((formData.get("pay_period_start") as string | null)?.trim() || null);
  const pay_period_end = parseDateInput((formData.get("pay_period_end") as string | null)?.trim() || null);
  if (pay_period_start && pay_period_end && pay_period_end < pay_period_start) return;

  await prisma.job_payroll_entries.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      job_id,
      effective_date,
      pay_period_start,
      pay_period_end,
      period_type: parsePeriodType((formData.get("period_type") as string | null)?.trim() || null),
      currency: (formData.get("currency") as string | null)?.trim() || "ILS",
      gross_amount: parseMoney((formData.get("gross_amount") as string | null) ?? null),
      net_amount: parseMoney((formData.get("net_amount") as string | null) ?? null),
      employee_deductions: parseMoney((formData.get("employee_deductions") as string | null) ?? null),
      employer_contributions: parseMoney((formData.get("employer_contributions") as string | null) ?? null),
      bonus_amount: parseMoney((formData.get("bonus_amount") as string | null) ?? null),
      equity_amount: parseMoney((formData.get("equity_amount") as string | null) ?? null),
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/jobs/${job_id}`);
}

export async function deleteJobPayrollEntry(id: string, jobId: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  await prisma.job_payroll_entries.deleteMany({
    where: { id, job_id: jobId, household_id: householdId },
  });

  revalidatePath(`/dashboard/jobs/${jobId}`);
}

export async function deleteJobDocument(id: string, jobId: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  await prisma.job_documents.deleteMany({
    where: { id, job_id: jobId, household_id: householdId },
  });

  revalidatePath(`/dashboard/jobs/${jobId}`);
}
