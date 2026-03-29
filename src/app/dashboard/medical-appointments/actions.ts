"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import type { MedicalAppointmentPaymentMethod, MedicalReimbursementRequestScope } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PAYMENT_METHODS: MedicalAppointmentPaymentMethod[] = [
  "cash",
  "credit_card",
  "bank_account",
  "digital_wallet",
  "kupat_holim_benefit",
  "other",
];

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseOptionalAmount(raw: string | null): { ok: true; value: number | null } | { ok: false } {
  const t = raw?.trim();
  if (!t) return { ok: true, value: null };
  const n = parseFloat(t);
  if (Number.isNaN(n) || n < 0) return { ok: false };
  return { ok: true, value: n };
}

function parseOptionalScope(raw: string | null): MedicalReimbursementRequestScope | null {
  const t = raw?.trim();
  if (t === "full" || t === "partial") return t;
  return null;
}

type ParsedMedicalPayload = {
  provider_name: string;
  visit_description: string | null;
  appointment_date: Date;
  family_member_id: string | null;
  currency: string;
  payment_method: MedicalAppointmentPaymentMethod;
  credit_card_id: string | null;
  bank_account_id: string | null;
  digital_payment_method_id: string | null;
  amount_out_of_pocket: number | null;
  notes: string | null;
  kupat_holim_request_submitted_at: Date | null;
  kupat_holim_request_scope: MedicalReimbursementRequestScope | null;
  kupat_holim_amount_received: number | null;
  kupat_holim_notes: string | null;
  private_insurance_request_submitted_at: Date | null;
  private_insurance_request_scope: MedicalReimbursementRequestScope | null;
  private_insurance_amount_received: number | null;
  private_insurance_notes: string | null;
};

type ParseMedicalOptions = {
  /** When editing, the previously saved FK may still be valid even if no longer in "active" pick lists. */
  preservedCreditCardId?: string | null;
  preservedBankAccountId?: string | null;
  preservedDigitalPaymentMethodId?: string | null;
};

async function parseMedicalAppointmentForm(
  formData: FormData,
  householdId: string,
  errorPath: string,
  options?: ParseMedicalOptions,
): Promise<ParsedMedicalPayload> {
  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  const visit_description = (formData.get("visit_description") as string | null)?.trim() || null;
  const appointment_date_raw = (formData.get("appointment_date") as string | null)?.trim();
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const payment_method_raw = (formData.get("payment_method") as string | null)?.trim();
  let credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  let bank_account_id = (formData.get("bank_account_id") as string | null)?.trim() || null;
  let digital_payment_method_id =
    (formData.get("digital_payment_method_id") as string | null)?.trim() || null;
  const notes = (formData.get("visit_notes") as string | null)?.trim() || null;

  const amountParsed = parseOptionalAmount(formData.get("amount_out_of_pocket") as string | null);
  if (!amountParsed.ok) {
    redirect(`${errorPath}?error=Invalid+amount+out+of+pocket`);
  }
  const amount_out_of_pocket = amountParsed.value;

  const kupat_holim_request_submitted_raw = (
    formData.get("kupat_holim_request_submitted_at") as string | null
  )?.trim();
  const kupat_holim_request_scope = parseOptionalScope(
    formData.get("kupat_holim_request_scope") as string | null,
  );
  const kupatReceivedParsed = parseOptionalAmount(formData.get("kupat_holim_amount_received") as string | null);
  if (!kupatReceivedParsed.ok) {
    redirect(`${errorPath}?error=Invalid+kupat+holim+amount+received`);
  }
  const kupat_holim_amount_received = kupatReceivedParsed.value;
  const kupat_holim_notes = (formData.get("kupat_holim_notes") as string | null)?.trim() || null;

  const private_insurance_request_submitted_raw = (
    formData.get("private_insurance_request_submitted_at") as string | null
  )?.trim();
  const private_insurance_request_scope = parseOptionalScope(
    formData.get("private_insurance_request_scope") as string | null,
  );
  const privateReceivedParsed = parseOptionalAmount(
    formData.get("private_insurance_amount_received") as string | null,
  );
  if (!privateReceivedParsed.ok) {
    redirect(`${errorPath}?error=Invalid+private+insurance+amount+received`);
  }
  const private_insurance_amount_received = privateReceivedParsed.value;
  const private_insurance_notes =
    (formData.get("private_insurance_notes") as string | null)?.trim() || null;

  if (!provider_name || !appointment_date_raw) {
    redirect(`${errorPath}?error=Provider+and+appointment+date+required`);
  }

  if (!payment_method_raw || !PAYMENT_METHODS.includes(payment_method_raw as MedicalAppointmentPaymentMethod)) {
    redirect(`${errorPath}?error=Invalid+payment+method`);
  }
  const payment_method = payment_method_raw as MedicalAppointmentPaymentMethod;

  const appointment_date = new Date(appointment_date_raw);
  if (Number.isNaN(appointment_date.getTime())) {
    redirect(`${errorPath}?error=Invalid+appointment+date`);
  }

  if (family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
      select: { id: true },
    });
    if (!member) {
      redirect(`${errorPath}?error=Invalid+family+member`);
    }
  }

  if (payment_method !== "credit_card") credit_card_id = null;
  if (payment_method !== "bank_account") bank_account_id = null;
  if (payment_method !== "digital_wallet") digital_payment_method_id = null;

  if (credit_card_id) {
    const today = startOfToday();
    const strictCard =
      credit_card_id !== options?.preservedCreditCardId
        ? {
            cancelled_at: null,
            OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
          }
        : {};
    const card = await prisma.credit_cards.findFirst({
      where: {
        id: credit_card_id,
        household_id: householdId,
        ...strictCard,
      },
    });
    if (!card) {
      redirect(`${errorPath}?error=Credit+card+must+be+active+and+not+expired`);
    }
  }

  if (bank_account_id) {
    const acct = await prisma.bank_accounts.findFirst({
      where: {
        id: bank_account_id,
        household_id: householdId,
        ...(bank_account_id !== options?.preservedBankAccountId ? { is_active: true } : {}),
      },
      select: { id: true },
    });
    if (!acct) {
      redirect(`${errorPath}?error=Invalid+bank+account`);
    }
  }

  if (digital_payment_method_id) {
    const dpm = await prisma.digital_payment_methods.findFirst({
      where: {
        id: digital_payment_method_id,
        household_id: householdId,
        ...(digital_payment_method_id !== options?.preservedDigitalPaymentMethodId
          ? { is_active: true }
          : {}),
      },
      select: { id: true },
    });
    if (!dpm) {
      redirect(`${errorPath}?error=Invalid+digital+payment+method`);
    }
  }

  let kupat_holim_request_submitted_at: Date | null = null;
  if (kupat_holim_request_submitted_raw) {
    kupat_holim_request_submitted_at = new Date(kupat_holim_request_submitted_raw);
    if (Number.isNaN(kupat_holim_request_submitted_at.getTime())) {
      redirect(`${errorPath}?error=Invalid+kupat+holim+request+date`);
    }
  }

  let private_insurance_request_submitted_at: Date | null = null;
  if (private_insurance_request_submitted_raw) {
    private_insurance_request_submitted_at = new Date(private_insurance_request_submitted_raw);
    if (Number.isNaN(private_insurance_request_submitted_at.getTime())) {
      redirect(`${errorPath}?error=Invalid+private+insurance+request+date`);
    }
  }

  return {
    provider_name,
    visit_description,
    appointment_date,
    family_member_id,
    currency,
    payment_method,
    credit_card_id,
    bank_account_id,
    digital_payment_method_id,
    amount_out_of_pocket,
    notes,
    kupat_holim_request_submitted_at,
    kupat_holim_request_scope,
    kupat_holim_amount_received,
    kupat_holim_notes,
    private_insurance_request_submitted_at,
    private_insurance_request_scope,
    private_insurance_amount_received,
    private_insurance_notes,
  };
}

export async function createMedicalAppointment(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/medical-appointments?error=No+household");
  }

  const payload = await parseMedicalAppointmentForm(
    formData,
    householdId,
    "/dashboard/medical-appointments",
  );

  await prisma.medical_appointments.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      ...payload,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/medical-appointments");
  redirect("/dashboard/medical-appointments?created=1");
}

export async function updateMedicalAppointment(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/medical-appointments?error=No+household");
  }

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) {
    redirect("/dashboard/medical-appointments?error=Missing+record+id");
  }

  const existing = await prisma.medical_appointments.findFirst({
    where: { id, household_id: householdId },
    select: {
      id: true,
      credit_card_id: true,
      bank_account_id: true,
      digital_payment_method_id: true,
    },
  });
  if (!existing) {
    redirect("/dashboard/medical-appointments?error=Not+found");
  }

  const payload = await parseMedicalAppointmentForm(formData, householdId, `/dashboard/medical-appointments/${id}`, {
    preservedCreditCardId: existing.credit_card_id,
    preservedBankAccountId: existing.bank_account_id,
    preservedDigitalPaymentMethodId: existing.digital_payment_method_id,
  });

  await prisma.medical_appointments.update({
    where: { id },
    data: payload,
  });

  revalidatePath("/dashboard/medical-appointments");
  revalidatePath(`/dashboard/medical-appointments/${id}`);
  redirect(`/dashboard/medical-appointments/${id}?updated=1`);
}
