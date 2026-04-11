"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function subscriptionFormContext(formData: FormData): "main" | "private_clinic_work" {
  const v = (formData.get("subscription_form_context") as string | null)?.trim();
  return v === "private_clinic_work" ? "private_clinic_work" : "main";
}

function revalidateSubscriptionPaths() {
  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/dashboard/private-clinic/work-subscriptions");
  revalidatePath("/dashboard/private-clinic/reminders");
}

function normalizeWebsiteUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid protocol");
  }
  return parsed.toString();
}

export async function createSubscription(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/subscriptions?error=No+household");
  }

  const name = (formData.get("name") as string | null)?.trim();
  const start_date_raw = (formData.get("start_date") as string | null)?.trim() || null;
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim() || null;
  const fee_amount_raw = (formData.get("fee_amount") as string | null)?.trim();
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const billing_interval = (formData.get("billing_interval") as string | null)?.trim();
  const monthly_day_of_month_raw = (formData.get("monthly_day_of_month") as string | null)?.trim() || null;
  const credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  const digital_payment_method_id =
    (formData.get("digital_payment_method_id") as string | null)?.trim() || null;
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const job_id_raw = (formData.get("job_id") as string | null)?.trim() || null;
  const formCtx = subscriptionFormContext(formData);
  if (formCtx === "private_clinic_work" && !job_id_raw) {
    redirect("/dashboard/private-clinic/work-subscriptions?error=Job+is+required");
  }
  const status = (formData.get("status") as string | null)?.trim() || "active";
  const cancelled_at_raw = (formData.get("cancelled_at") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const website_url_raw = (formData.get("website_url") as string | null) || null;

  if (!name || !fee_amount_raw || !billing_interval) {
    redirect(
      formCtx === "private_clinic_work"
        ? "/dashboard/private-clinic/work-subscriptions?error=Required+fields+missing"
        : "/dashboard/subscriptions?error=Required+fields+missing",
    );
  }
  if (status !== "active" && status !== "cancelled") {
    redirect(
      formCtx === "private_clinic_work"
        ? "/dashboard/private-clinic/work-subscriptions?error=Invalid+status"
        : "/dashboard/subscriptions?error=Invalid+status",
    );
  }
  if (billing_interval !== "monthly" && billing_interval !== "annual") {
    redirect(
      formCtx === "private_clinic_work"
        ? "/dashboard/private-clinic/work-subscriptions?error=Invalid+billing+interval"
        : "/dashboard/subscriptions?error=Invalid+billing+interval",
    );
  }

  let monthly_day_of_month: number | null = null;
  if (billing_interval === "monthly") {
    if (!monthly_day_of_month_raw) {
      redirect(
        formCtx === "private_clinic_work"
          ? "/dashboard/private-clinic/work-subscriptions?error=Monthly+day+is+required"
          : "/dashboard/subscriptions?error=Monthly+day+is+required",
      );
    }
    const parsedDay = Number.parseInt(monthly_day_of_month_raw, 10);
    if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      redirect(
        formCtx === "private_clinic_work"
          ? "/dashboard/private-clinic/work-subscriptions?error=Monthly+day+must+be+between+1+and+31"
          : "/dashboard/subscriptions?error=Monthly+day+must+be+between+1+and+31",
      );
    }
    monthly_day_of_month = parsedDay;
  }

  const fee_amount = parseFloat(fee_amount_raw);
  if (Number.isNaN(fee_amount) || fee_amount < 0) {
    redirect(
      formCtx === "private_clinic_work"
        ? "/dashboard/private-clinic/work-subscriptions?error=Invalid+fee+amount"
        : "/dashboard/subscriptions?error=Invalid+fee+amount",
    );
  }
  let website_url: string | null = null;
  try {
    website_url = normalizeWebsiteUrl(website_url_raw);
  } catch {
    redirect(
      formCtx === "private_clinic_work"
        ? "/dashboard/private-clinic/work-subscriptions?error=Invalid+website+URL"
        : "/dashboard/subscriptions?error=Invalid+website+URL",
    );
  }

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
      redirect(
        formCtx === "private_clinic_work"
          ? "/dashboard/private-clinic/work-subscriptions?error=Credit+card+must+be+active+and+not+expired"
          : "/dashboard/subscriptions?error=Credit+card+must+be+active+and+not+expired",
      );
    }
  }

  if (digital_payment_method_id) {
    const dpm = await prisma.digital_payment_methods.findFirst({
      where: { id: digital_payment_method_id, household_id: householdId, is_active: true },
      select: { id: true },
    });
    if (!dpm) {
      redirect(
        formCtx === "private_clinic_work"
          ? "/dashboard/private-clinic/work-subscriptions?error=Invalid+digital+payment+method"
          : "/dashboard/subscriptions?error=Invalid+digital+payment+method",
      );
    }
  }

  if (family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
      select: { id: true },
    });
    if (!member) {
      redirect(
        formCtx === "private_clinic_work"
          ? "/dashboard/private-clinic/work-subscriptions?error=Invalid+family+member"
          : "/dashboard/subscriptions?error=Invalid+family+member",
      );
    }
  }

  let job_id: string | null = null;
  if (job_id_raw) {
    const jobRow = await prisma.jobs.findFirst({
      where: { id: job_id_raw, household_id: householdId },
      select: { id: true },
    });
    if (!jobRow) {
      redirect(
        formCtx === "private_clinic_work"
          ? "/dashboard/private-clinic/work-subscriptions?error=Invalid+job"
          : "/dashboard/subscriptions?error=Invalid+job",
      );
    }
    job_id = jobRow.id;
  }

  let start_date: Date | null = null;
  if (start_date_raw) {
    start_date = new Date(start_date_raw);
    if (Number.isNaN(start_date.getTime())) {
      redirect(
        formCtx === "private_clinic_work"
          ? "/dashboard/private-clinic/work-subscriptions?error=Invalid+start+date"
          : "/dashboard/subscriptions?error=Invalid+start+date",
      );
    }
  }

  let renewal_date: Date | null = null;
  if (renewal_date_raw) {
    renewal_date = new Date(renewal_date_raw);
    if (Number.isNaN(renewal_date.getTime())) {
      redirect(
        formCtx === "private_clinic_work"
          ? "/dashboard/private-clinic/work-subscriptions?error=Invalid+renewal+date"
          : "/dashboard/subscriptions?error=Invalid+renewal+date",
      );
    }
  }

  let cancelled_at: Date | null = null;
  if (status === "cancelled") {
    if (!cancelled_at_raw) {
      redirect(
        formCtx === "private_clinic_work"
          ? "/dashboard/private-clinic/work-subscriptions?error=Cancellation+date+required"
          : "/dashboard/subscriptions?error=Cancellation+date+required",
      );
    }
    cancelled_at = new Date(cancelled_at_raw);
    if (Number.isNaN(cancelled_at.getTime())) {
      redirect(
        formCtx === "private_clinic_work"
          ? "/dashboard/private-clinic/work-subscriptions?error=Invalid+cancelled+date"
          : "/dashboard/subscriptions?error=Invalid+cancelled+date",
      );
    }
  }

  await prisma.subscriptions.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      start_date,
      renewal_date,
      fee_amount,
      currency,
      billing_interval: billing_interval as "monthly" | "annual",
      monthly_day_of_month,
      credit_card_id,
      digital_payment_method_id,
      family_member_id,
      job_id,
      description,
      website_url,
      is_active: status === "active",
      cancelled_at,
    },
  });

  revalidateSubscriptionPaths();
  if (formCtx === "private_clinic_work") {
    redirect("/dashboard/private-clinic/work-subscriptions?created=1");
  }
  redirect("/dashboard/subscriptions?created=1");
}

export async function updateSubscription(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/subscriptions?error=No+household");
  }

  const id = (formData.get("id") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const start_date_raw = (formData.get("start_date") as string | null)?.trim() || null;
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim() || null;
  const fee_amount_raw = (formData.get("fee_amount") as string | null)?.trim();
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const billing_interval = (formData.get("billing_interval") as string | null)?.trim();
  const monthly_day_of_month_raw = (formData.get("monthly_day_of_month") as string | null)?.trim() || null;
  const credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  const digital_payment_method_id =
    (formData.get("digital_payment_method_id") as string | null)?.trim() || null;
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const job_id_raw = (formData.get("job_id") as string | null)?.trim() || null;
  const status = (formData.get("status") as string | null)?.trim() || "active";
  const cancelled_at_raw = (formData.get("cancelled_at") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const website_url_raw = (formData.get("website_url") as string | null) || null;

  if (!id || !name || !fee_amount_raw || !billing_interval) {
    redirect("/dashboard/subscriptions?error=Required+fields+missing");
  }

  const existingSub = await prisma.subscriptions.findFirst({
    where: { id, household_id: householdId },
    select: { digital_payment_method_id: true },
  });
  if (!existingSub) {
    redirect("/dashboard/subscriptions?error=Not+found");
  }

  if (status !== "active" && status !== "cancelled") {
    redirect(`/dashboard/subscriptions/${id}?error=Invalid+status`);
  }
  if (billing_interval !== "monthly" && billing_interval !== "annual") {
    redirect(`/dashboard/subscriptions/${id}?error=Invalid+billing+interval`);
  }

  let monthly_day_of_month: number | null = null;
  if (billing_interval === "monthly") {
    if (!monthly_day_of_month_raw) {
      redirect(`/dashboard/subscriptions/${id}?error=Monthly+day+is+required`);
    }
    const parsedDay = Number.parseInt(monthly_day_of_month_raw, 10);
    if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      redirect(`/dashboard/subscriptions/${id}?error=Monthly+day+must+be+between+1+and+31`);
    }
    monthly_day_of_month = parsedDay;
  }

  const fee_amount = parseFloat(fee_amount_raw);
  if (Number.isNaN(fee_amount) || fee_amount < 0) {
    redirect(`/dashboard/subscriptions/${id}?error=Invalid+fee+amount`);
  }
  let website_url: string | null = null;
  try {
    website_url = normalizeWebsiteUrl(website_url_raw);
  } catch {
    redirect(`/dashboard/subscriptions/${id}?error=Invalid+website+URL`);
  }

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
      redirect(`/dashboard/subscriptions/${id}?error=Credit+card+must+be+active+and+not+expired`);
    }
  }

  if (digital_payment_method_id) {
    const dpm = await prisma.digital_payment_methods.findFirst({
      where: { id: digital_payment_method_id, household_id: householdId },
      select: { id: true, is_active: true },
    });
    if (
      !dpm ||
      (!dpm.is_active && dpm.id !== existingSub.digital_payment_method_id)
    ) {
      redirect(`/dashboard/subscriptions/${id}?error=Invalid+digital+payment+method`);
    }
  }

  if (family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
      select: { id: true },
    });
    if (!member) {
      redirect(`/dashboard/subscriptions/${id}?error=Invalid+family+member`);
    }
  }

  let job_id: string | null = null;
  if (job_id_raw) {
    const jobRow = await prisma.jobs.findFirst({
      where: { id: job_id_raw, household_id: householdId },
      select: { id: true },
    });
    if (!jobRow) {
      redirect(`/dashboard/subscriptions/${id}?error=Invalid+job`);
    }
    job_id = jobRow.id;
  }

  let start_date: Date | null = null;
  if (start_date_raw) {
    start_date = new Date(start_date_raw);
    if (Number.isNaN(start_date.getTime())) {
      redirect(`/dashboard/subscriptions/${id}?error=Invalid+start+date`);
    }
  }

  let renewal_date: Date | null = null;
  if (renewal_date_raw) {
    renewal_date = new Date(renewal_date_raw);
    if (Number.isNaN(renewal_date.getTime())) {
      redirect(`/dashboard/subscriptions/${id}?error=Invalid+renewal+date`);
    }
  }

  let cancelled_at: Date | null = null;
  if (status === "cancelled") {
    if (!cancelled_at_raw) {
      redirect(`/dashboard/subscriptions/${id}?error=Cancellation+date+required`);
    }
    cancelled_at = new Date(cancelled_at_raw);
    if (Number.isNaN(cancelled_at.getTime())) {
      redirect(`/dashboard/subscriptions/${id}?error=Invalid+cancelled+date`);
    }
  }

  await prisma.subscriptions.updateMany({
    where: { id, household_id: householdId },
    data: {
      name,
      start_date,
      renewal_date,
      fee_amount,
      currency,
      billing_interval: billing_interval as "monthly" | "annual",
      monthly_day_of_month,
      credit_card_id,
      digital_payment_method_id,
      family_member_id,
      job_id,
      description,
      website_url,
      is_active: status === "active",
      cancelled_at,
    },
  });

  revalidateSubscriptionPaths();
  revalidatePath(`/dashboard/subscriptions/${id}`);
  redirect("/dashboard/subscriptions?updated=1");
}

