"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { ensureDefaultExpenseCategories, ensureTherapySettings } from "@/lib/therapy/bootstrap";
import { materializeSeriesAppointments } from "@/lib/therapy/series-materialize";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  TherapyAppointmentRecurrence,
  TherapyAppointmentStatus,
  TherapyReceiptPaymentMethod,
  TherapyReceiptRecipientType,
  TherapyVisitType,
} from "@/generated/prisma/enums";

const BASE = "/dashboard/private-clinic";

async function householdIdOrRedirect(): Promise<string> {
  await requireHouseholdMember();
  const id = await getCurrentHouseholdId();
  if (!id) redirect("/");
  return id;
}

async function assertJob(householdId: string, jobId: string) {
  const j = await prisma.jobs.findFirst({
    where: { id: jobId, household_id: householdId },
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

function parseAppointmentStatus(raw: string | null | undefined): TherapyAppointmentStatus | null {
  if (raw === "scheduled" || raw === "cancelled" || raw === "completed") return raw;
  return null;
}

function parseSeriesRecurrence(raw: string | null | undefined): TherapyAppointmentRecurrence | null {
  if (raw === "weekly" || raw === "biweekly") return raw;
  return null;
}

// --- Settings ---

export async function updateTherapySettings(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  await ensureTherapySettings(householdId);

  const note_1_label = (formData.get("note_1_label") as string)?.trim() || "Note 1";
  const note_2_label = (formData.get("note_2_label") as string)?.trim() || "Note 2";
  const note_3_label = (formData.get("note_3_label") as string)?.trim() || "Note 3";

  await prisma.therapy_settings.update({
    where: { household_id: householdId },
    data: { note_1_label, note_2_label, note_3_label },
  });

  revalidatePath(`${BASE}/settings`);
  redirect(`${BASE}/settings?updated=1`);
}

// --- Programs ---

export async function createTherapyProgram(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const name = (formData.get("name") as string)?.trim() || "";
  if (!job_id || !name) redirect(`${BASE}/programs?error=missing`);
  if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/programs?error=job`);

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
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirect(`${BASE}/programs?error=id`);
  const row = await prisma.therapy_service_programs.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirect(`${BASE}/programs?error=notfound`);

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
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirect(`${BASE}/programs?error=id`);
  await prisma.therapy_service_programs.deleteMany({
    where: { id, household_id: householdId },
  });
  revalidatePath(`${BASE}/programs`);
  redirect(`${BASE}/programs?updated=1`);
}

// --- Clients ---

export async function createTherapyClient(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const first_name = (formData.get("first_name") as string)?.trim() || "";
  const default_program_id = (formData.get("default_program_id") as string)?.trim() || "";
  if (!first_name || !default_program_id) {
    redirect(`${BASE}/clients?error=missing`);
  }
  const prog = await assertProgram(householdId, default_program_id);
  if (!prog) redirect(`${BASE}/clients?error=program`);
  const default_job_id = prog.job_id;

  const jobIdsRaw = formData.getAll("job_ids") as string[];
  const jobIds = [...new Set(jobIdsRaw.map((s) => String(s).trim()).filter(Boolean))];
  if (!jobIds.includes(default_job_id)) jobIds.push(default_job_id);

  const id = crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.therapy_clients.create({
      data: {
        id,
        household_id: householdId,
        first_name,
        last_name: (formData.get("last_name") as string)?.trim() || null,
        id_number: (formData.get("id_number") as string)?.trim() || null,
        start_date: parseDate((formData.get("start_date") as string) || null),
        notes: (formData.get("notes") as string)?.trim() || null,
        default_job_id,
        default_program_id,
        email: (formData.get("email") as string)?.trim() || null,
        phones: (formData.get("phones") as string)?.trim() || null,
        address: (formData.get("address") as string)?.trim() || null,
      },
    });

    for (const jid of jobIds) {
      if (!(await assertJob(householdId, jid))) continue;
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
  redirect(`${BASE}/clients?created=1`);
}

export async function updateTherapyClient(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const id = (formData.get("id") as string)?.trim() || "";
  if (!(await assertClient(householdId, id))) redirect(`${BASE}/clients?error=notfound`);

  const default_program_id = (formData.get("default_program_id") as string)?.trim() || "";
  if (!default_program_id) redirect(`${BASE}/clients?error=missing`);
  const prog = await assertProgram(householdId, default_program_id);
  if (!prog) redirect(`${BASE}/clients?error=program`);
  const default_job_id = prog.job_id;

  const jobIdsRaw = formData.getAll("job_ids") as string[];
  const jobIds = [...new Set(jobIdsRaw.map((s) => String(s).trim()).filter(Boolean))];
  if (!jobIds.includes(default_job_id)) jobIds.push(default_job_id);

  await prisma.$transaction(async (tx) => {
    await tx.therapy_clients.update({
      where: { id },
      data: {
        first_name: (formData.get("first_name") as string)?.trim() || "",
        last_name: (formData.get("last_name") as string)?.trim() || null,
        id_number: (formData.get("id_number") as string)?.trim() || null,
        start_date: parseDate((formData.get("start_date") as string) || null),
        notes: (formData.get("notes") as string)?.trim() || null,
        default_job_id,
        default_program_id,
        email: (formData.get("email") as string)?.trim() || null,
        phones: (formData.get("phones") as string)?.trim() || null,
        address: (formData.get("address") as string)?.trim() || null,
        is_active: formData.has("is_active"),
      },
    });

    await tx.therapy_clients_jobs.deleteMany({ where: { client_id: id, household_id: householdId } });
    for (const jid of jobIds) {
      if (!(await assertJob(householdId, jid))) continue;
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
  redirect(`${BASE}/clients?updated=1`);
}

// --- Treatments ---

export async function createTherapyTreatment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const client_id = (formData.get("client_id") as string)?.trim() || "";
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const program_id = (formData.get("program_id") as string)?.trim() || "";
  const occurred_at_raw = (formData.get("occurred_at") as string)?.trim() || "";
  const amountStr = parseMoney(formData.get("amount") as string);
  const visit_type = parseVisitType((formData.get("visit_type") as string)?.trim() || null);

  if (!client_id || !job_id || !program_id || !occurred_at_raw || !amountStr || !visit_type) {
    redirect(`${BASE}/treatments?error=missing`);
  }
  if (!(await assertClient(householdId, client_id))) redirect(`${BASE}/treatments?error=client`);
  if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/treatments?error=job`);
  const prog = await assertProgram(householdId, program_id);
  if (!prog || prog.job_id !== job_id) redirect(`${BASE}/treatments?error=program`);

  const occurred_at = new Date(occurred_at_raw);
  if (Number.isNaN(occurred_at.getTime())) redirect(`${BASE}/treatments?error=date`);

  const linkRaw = (formData.get("linked_transaction_id") as string)?.trim();
  let linked_transaction_id: string | null = null;
  if (linkRaw) {
    const txRow = await prisma.transactions.findFirst({
      where: { id: linkRaw, household_id: householdId },
      select: { id: true },
    });
    linked_transaction_id = txRow?.id ?? null;
  }

  await prisma.therapy_treatments.create({
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
    },
  });

  revalidatePath(`${BASE}/treatments`);
  redirect(`${BASE}/treatments?created=1`);
}

export async function updateTherapyTreatment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const id = (formData.get("id") as string)?.trim() || "";
  const row = await prisma.therapy_treatments.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirect(`${BASE}/treatments?error=notfound`);

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const program_id = (formData.get("program_id") as string)?.trim() || "";
  const occurred_at_raw = (formData.get("occurred_at") as string)?.trim() || "";
  const amountStr = parseMoney(formData.get("amount") as string);
  const visit_type = parseVisitType((formData.get("visit_type") as string)?.trim() || null);

  if (!job_id || !program_id || !occurred_at_raw || !amountStr || !visit_type) {
    redirect(`${BASE}/treatments?error=missing`);
  }
  const prog = await assertProgram(householdId, program_id);
  if (!prog || prog.job_id !== job_id) redirect(`${BASE}/treatments?error=program`);

  const occurred_at = new Date(occurred_at_raw);
  if (Number.isNaN(occurred_at.getTime())) redirect(`${BASE}/treatments?error=date`);

  const linkRaw = (formData.get("linked_transaction_id") as string)?.trim();
  let linked_transaction_id: string | null = null;
  if (linkRaw) {
    const txRow = await prisma.transactions.findFirst({
      where: { id: linkRaw, household_id: householdId },
      select: { id: true },
    });
    linked_transaction_id = txRow?.id ?? null;
  }

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
    },
  });

  revalidatePath(`${BASE}/treatments`);
  redirect(`${BASE}/treatments?updated=1`);
}

export async function deleteTherapyTreatment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirect(`${BASE}/treatments?error=id`);
  await prisma.therapy_treatments.deleteMany({ where: { id, household_id: householdId } });
  revalidatePath(`${BASE}/treatments`);
  redirect(`${BASE}/treatments?updated=1`);
}

// --- Receipts ---

export async function createTherapyReceipt(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const receipt_number = (formData.get("receipt_number") as string)?.trim() || "";
  const issued_at = parseDateRequired((formData.get("issued_at") as string) || null);
  const totalStr = parseMoney(formData.get("total_amount") as string);
  const recipient_type = parseRecipientType((formData.get("recipient_type") as string)?.trim() || null);
  const payment_method = parseReceiptPaymentMethod((formData.get("payment_method") as string)?.trim() || null);

  if (!job_id || !receipt_number || !issued_at || !totalStr || !recipient_type || !payment_method) {
    redirect(`${BASE}/receipts?error=missing`);
  }
  if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/receipts?error=job`);

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
      notes: (formData.get("notes") as string)?.trim() || null,
      linked_transaction_id,
    },
  });

  revalidatePath(`${BASE}/receipts`);
  redirect(`${BASE}/receipts/${id}`);
}

export async function updateTherapyReceipt(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const id = (formData.get("id") as string)?.trim() || "";
  const row = await prisma.therapy_receipts.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirect(`${BASE}/receipts?error=notfound`);

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const issued_at = parseDateRequired((formData.get("issued_at") as string) || null);
  const totalStr = parseMoney(formData.get("total_amount") as string);
  if (!job_id || !issued_at || !totalStr) redirect(`${BASE}/receipts?error=missing`);
  if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/receipts?error=job`);

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
  if (!recipient_type || !payment_method) redirect(`${BASE}/receipts?error=badenum`);

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
      notes: (formData.get("notes") as string)?.trim() || null,
      linked_transaction_id,
    },
  });

  revalidatePath(`${BASE}/receipts`);
  revalidatePath(`${BASE}/receipts/${id}`);
  redirect(`${BASE}/receipts/${id}?updated=1`);
}

export async function upsertReceiptAllocation(formData: FormData) {
  const householdId = await householdIdOrRedirect();
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
  if (!receipt || !treatment) return;

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
  redirect(`${BASE}/receipts/${receiptId}`);
}

// --- Expenses ---

export async function createTherapyExpenseCategory(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  await ensureDefaultExpenseCategories(householdId);
  const name = (formData.get("name") as string)?.trim() || "";
  if (!name) redirect(`${BASE}/settings?error=cat`);

  await prisma.therapy_expense_categories.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      is_system: false,
      sort_order: 100,
    },
  });

  revalidatePath(`${BASE}/settings`);
  redirect(`${BASE}/settings?cat=1`);
}

export async function createTherapyJobExpense(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  await ensureDefaultExpenseCategories(householdId);

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const category_id = (formData.get("category_id") as string)?.trim() || "";
  const expense_date = parseDateRequired((formData.get("expense_date") as string) || null);
  const amountStr = parseMoney(formData.get("amount") as string);
  if (!job_id || !category_id || !expense_date || !amountStr) {
    redirect(`${BASE}/expenses?error=missing`);
  }
  if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/expenses?error=job`);

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
  const id = (formData.get("id") as string)?.trim() || "";
  const row = await prisma.therapy_job_expenses.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirect(`${BASE}/expenses?error=notfound`);

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const category_id = (formData.get("category_id") as string)?.trim() || "";
  const expense_date = parseDateRequired((formData.get("expense_date") as string) || null);
  const amountStr = parseMoney(formData.get("amount") as string);
  if (!job_id || !category_id || !expense_date || !amountStr) {
    redirect(`${BASE}/expenses?error=missing`);
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
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirect(`${BASE}/expenses?error=id`);
  await prisma.therapy_job_expenses.deleteMany({ where: { id, household_id: householdId } });
  revalidatePath(`${BASE}/expenses`);
  redirect(`${BASE}/expenses?updated=1`);
}

// --- Appointments ---

export async function createTherapyAppointment(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const client_id = (formData.get("client_id") as string)?.trim() || "";
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const program_id = (formData.get("program_id") as string)?.trim() || "";
  const visit_type = parseVisitType((formData.get("visit_type") as string)?.trim() || null);
  const start_at_raw = (formData.get("start_at") as string)?.trim() || "";
  if (!client_id || !job_id || !visit_type || !start_at_raw) {
    redirect(`${BASE}/appointments?error=missing`);
  }
  if (!(await assertClient(householdId, client_id))) redirect(`${BASE}/appointments?error=client`);
  if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/appointments?error=job`);

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
  const id = (formData.get("id") as string)?.trim() || "";
  const status = parseAppointmentStatus((formData.get("status") as string)?.trim() || null);
  if (!id || !status) return;

  await prisma.therapy_appointments.updateMany({
    where: { id, household_id: householdId },
    data: { status },
  });

  revalidatePath(`${BASE}/appointments`);
}

export async function createTherapyAppointmentSeries(formData: FormData) {
  const householdId = await householdIdOrRedirect();
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

  if (!(await assertClient(householdId, client_id))) redirect(`${BASE}/appointments?error=client`);
  if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/appointments?error=job`);

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
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) redirect(`${BASE}/appointments?error=id`);
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
  const householdId = await householdIdOrRedirect();
  const name = (formData.get("name") as string)?.trim() || "";
  if (!name) redirect(`${BASE}/settings?error=ctype`);

  await prisma.therapy_consultation_types.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      is_system: false,
      sort_order: 200,
    },
  });

  revalidatePath(`${BASE}/settings`);
  revalidatePath(`${BASE}/consultations`);
  redirect(`${BASE}/settings?ctype=1`);
}

export async function deleteTherapyConsultationType(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) return;
  await prisma.therapy_consultation_types.deleteMany({
    where: { id, household_id: householdId, is_system: false },
  });
  revalidatePath(`${BASE}/settings`);
  revalidatePath(`${BASE}/consultations`);
}

// --- Consultations (meetings) ---

export async function createTherapyConsultation(formData: FormData) {
  const householdId = await householdIdOrRedirect();
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const consultation_type_id = (formData.get("consultation_type_id") as string)?.trim() || "";
  const occurred_at_raw = (formData.get("occurred_at") as string)?.trim() || "";
  if (!job_id || !consultation_type_id || !occurred_at_raw) {
    redirect(`${BASE}/consultations?error=missing`);
  }
  if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/consultations?error=job`);
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
  const id = (formData.get("id") as string)?.trim() || "";
  const row = await prisma.therapy_consultations.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirect(`${BASE}/consultations?error=notfound`);

  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const consultation_type_id = (formData.get("consultation_type_id") as string)?.trim() || "";
  const occurred_at_raw = (formData.get("occurred_at") as string)?.trim() || "";
  if (!job_id || !consultation_type_id || !occurred_at_raw) {
    redirect(`${BASE}/consultations?error=missing`);
  }
  if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/consultations?error=job`);
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
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) return;
  await prisma.therapy_consultations.deleteMany({
    where: { id, household_id: householdId },
  });
  revalidatePath(`${BASE}/consultations`);
  redirect(`${BASE}/consultations?updated=1`);
}

// --- Travel ---

export async function createTherapyTravelEntry(formData: FormData) {
  const householdId = await householdIdOrRedirect();
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
    treatmentId = t.id;
  } else if (scope === "job") {
    if (!job_id) redirect(`${BASE}/travel?error=missing`);
    if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/travel?error=job`);
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
  const id = (formData.get("id") as string)?.trim() || "";
  const row = await prisma.therapy_travel_entries.findFirst({
    where: { id, household_id: householdId },
  });
  if (!row) redirect(`${BASE}/travel?error=notfound`);

  const scope = (formData.get("link_scope") as string)?.trim() || "";
  const job_id = (formData.get("job_id") as string)?.trim() || "";
  const treatment_id = (formData.get("treatment_id") as string)?.trim() || "";

  let jobId: string | null = null;
  let treatmentId: string | null = null;

  if (scope === "treatment") {
    if (!treatment_id) redirect(`${BASE}/travel?error=missing`);
    const t = await assertTreatmentForHousehold(householdId, treatment_id);
    if (!t) redirect(`${BASE}/travel?error=treatment`);
    treatmentId = t.id;
  } else {
    if (!job_id) redirect(`${BASE}/travel?error=missing`);
    if (!(await assertJob(householdId, job_id))) redirect(`${BASE}/travel?error=job`);
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
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) return;
  await prisma.therapy_travel_entries.deleteMany({
    where: { id, household_id: householdId },
  });
  revalidatePath(`${BASE}/travel`);
  redirect(`${BASE}/travel?updated=1`);
}
