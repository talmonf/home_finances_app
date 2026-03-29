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

export async function createMedicalAppointment(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/medical-appointments?error=No+household");
  }

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
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  const amountParsed = parseOptionalAmount(formData.get("amount_out_of_pocket") as string | null);
  if (!amountParsed.ok) {
    redirect("/dashboard/medical-appointments?error=Invalid+amount+out+of+pocket");
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
    redirect("/dashboard/medical-appointments?error=Invalid+kupat+holim+amount+received");
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
    redirect("/dashboard/medical-appointments?error=Invalid+private+insurance+amount+received");
  }
  const private_insurance_amount_received = privateReceivedParsed.value;
  const private_insurance_notes =
    (formData.get("private_insurance_notes") as string | null)?.trim() || null;

  if (!provider_name || !appointment_date_raw) {
    redirect("/dashboard/medical-appointments?error=Provider+and+appointment+date+required");
  }

  if (!payment_method_raw || !PAYMENT_METHODS.includes(payment_method_raw as MedicalAppointmentPaymentMethod)) {
    redirect("/dashboard/medical-appointments?error=Invalid+payment+method");
  }
  const payment_method = payment_method_raw as MedicalAppointmentPaymentMethod;

  const appointment_date = new Date(appointment_date_raw);
  if (Number.isNaN(appointment_date.getTime())) {
    redirect("/dashboard/medical-appointments?error=Invalid+appointment+date");
  }

  if (family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
      select: { id: true },
    });
    if (!member) {
      redirect("/dashboard/medical-appointments?error=Invalid+family+member");
    }
  }

  if (payment_method !== "credit_card") credit_card_id = null;
  if (payment_method !== "bank_account") bank_account_id = null;
  if (payment_method !== "digital_wallet") digital_payment_method_id = null;

  if (credit_card_id) {
    const today = startOfToday();
    const card = await prisma.credit_cards.findFirst({
      where: {
        id: credit_card_id,
        household_id: householdId,
        cancelled_at: null,
        OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
      },
    });
    if (!card) {
      redirect("/dashboard/medical-appointments?error=Credit+card+must+be+active+and+not+expired");
    }
  }

  if (bank_account_id) {
    const acct = await prisma.bank_accounts.findFirst({
      where: { id: bank_account_id, household_id: householdId },
      select: { id: true },
    });
    if (!acct) {
      redirect("/dashboard/medical-appointments?error=Invalid+bank+account");
    }
  }

  if (digital_payment_method_id) {
    const dpm = await prisma.digital_payment_methods.findFirst({
      where: { id: digital_payment_method_id, household_id: householdId },
      select: { id: true },
    });
    if (!dpm) {
      redirect("/dashboard/medical-appointments?error=Invalid+digital+payment+method");
    }
  }

  let kupat_holim_request_submitted_at: Date | null = null;
  if (kupat_holim_request_submitted_raw) {
    kupat_holim_request_submitted_at = new Date(kupat_holim_request_submitted_raw);
    if (Number.isNaN(kupat_holim_request_submitted_at.getTime())) {
      redirect("/dashboard/medical-appointments?error=Invalid+kupat+holim+request+date");
    }
  }

  let private_insurance_request_submitted_at: Date | null = null;
  if (private_insurance_request_submitted_raw) {
    private_insurance_request_submitted_at = new Date(private_insurance_request_submitted_raw);
    if (Number.isNaN(private_insurance_request_submitted_at.getTime())) {
      redirect("/dashboard/medical-appointments?error=Invalid+private+insurance+request+date");
    }
  }

  await prisma.medical_appointments.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      family_member_id,
      appointment_date,
      provider_name,
      visit_description,
      amount_out_of_pocket,
      currency,
      payment_method,
      credit_card_id,
      bank_account_id,
      digital_payment_method_id,
      kupat_holim_request_submitted_at,
      kupat_holim_request_scope,
      kupat_holim_amount_received,
      kupat_holim_notes,
      private_insurance_request_submitted_at,
      private_insurance_request_scope,
      private_insurance_amount_received,
      private_insurance_notes,
      notes,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/medical-appointments");
  redirect("/dashboard/medical-appointments?created=1");
}

export async function toggleMedicalAppointmentActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/medical-appointments?error=No+household");
  }

  await prisma.medical_appointments.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/medical-appointments");
  redirect("/dashboard/medical-appointments?updated=1");
}
