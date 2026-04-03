"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { DonationKind, DonationPaymentMethod } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseOptionalDecimal(raw: string | null): { ok: true; value: string } | { ok: false; error: string } {
  const t = raw?.trim() ?? "";
  if (!t) return { ok: false, error: "Amount required" };
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Invalid amount" };
  return { ok: true, value: n.toFixed(2) };
}

function parsePositiveInt(raw: string | null): { ok: true; value: number } | { ok: false; error: string } {
  const t = raw?.trim() ?? "";
  if (!t) return { ok: false, error: "Number of months required" };
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) return { ok: false, error: "Months must be at least 1" };
  return { ok: true, value: n };
}

function parseDateOnlyLocalNoon(raw: string): Date | null {
  // date inputs come as "YYYY-MM-DD"; parsing with `new Date(raw)` treats it like UTC
  // and can shift the day depending on server/browser timezone.
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1; // JS month is 0-based
  const day = Number(match[3]);
  const d = new Date(year, monthIndex, day, 12, 0, 0, 0); // noon avoids edge-of-day timezone issues
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createDonation(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/donations?error=No+household");
  }

  const kindRaw = (formData.get("kind") as string | null)?.trim();
  const organization_name = (formData.get("organization_name") as string | null)?.trim();
  const category = (formData.get("category") as string | null)?.trim() || "Other";
  const family_member_id_raw = (formData.get("family_member_id") as string | null)?.trim() || null;
  const payment_method_raw = (formData.get("payment_method") as string | null)?.trim() || null;
  const organization_tax_number =
    (formData.get("organization_tax_number") as string | null)?.trim() || null;
  const organization_website_url =
    (formData.get("organization_website_url") as string | null)?.trim() || null;
  const organization_phone = (formData.get("organization_phone") as string | null)?.trim() || null;
  const organization_email = (formData.get("organization_email") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const payee_id_raw = (formData.get("payee_id") as string | null)?.trim() || null;
  const credit_card_id_raw = (formData.get("credit_card_id") as string | null)?.trim() || null;
  const bank_account_id_raw = (formData.get("bank_account_id") as string | null)?.trim() || null;
  const digital_payment_method_id_raw =
    (formData.get("digital_payment_method_id") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const provides_seif_46_receipts = formData.get("provides_seif_46_receipts") === "on";
  const tax_authority_info_passed = formData.get("tax_authority_info_passed") === "on";
  const statusRaw = (formData.get("status") as string | null)?.trim() || "active";
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim();
  let renewal_date: Date | null = null;
  if (renewal_date_raw) {
    const parsed = parseDateOnlyLocalNoon(renewal_date_raw);
    if (!parsed) {
      redirect("/dashboard/donations?error=Invalid+renewal+reminder+date");
    }
    renewal_date = parsed;
  }

  if (!organization_name) {
    redirect("/dashboard/donations?error=Organization+name+required");
  }

  if (kindRaw !== DonationKind.one_time && kindRaw !== DonationKind.monthly_commitment) {
    redirect("/dashboard/donations?error=Invalid+donation+type");
  }

  if (statusRaw !== "active" && statusRaw !== "historic") {
    redirect("/dashboard/donations?error=Invalid+donation+status");
  }
  const is_active = statusRaw === "active";

  if (!family_member_id_raw) {
    redirect("/dashboard/donations?error=Family+member+required");
  }

  const allowedPaymentMethods: DonationPaymentMethod[] = [
    "cash",
    "credit_card",
    "bank_account",
    "digital_wallet",
    "other",
  ];
  if (!payment_method_raw || !allowedPaymentMethods.includes(payment_method_raw as DonationPaymentMethod)) {
    redirect("/dashboard/donations?error=Invalid+payment+method");
  }
  const payment_method = payment_method_raw as DonationPaymentMethod;

  const today = startOfToday();
  const member = await prisma.family_members.findFirst({
    where: { id: family_member_id_raw, household_id: householdId },
    select: { id: true },
  });
  if (!member) {
    redirect("/dashboard/donations?error=Invalid+family+member");
  }

  let credit_card_id: string | null = credit_card_id_raw;
  let bank_account_id: string | null = bank_account_id_raw;
  let digital_payment_method_id: string | null = digital_payment_method_id_raw;

  if (payment_method === "credit_card") {
    if (!credit_card_id) redirect("/dashboard/donations?error=Credit+card+required");
    const card = await prisma.credit_cards.findFirst({
      where: {
        id: credit_card_id,
        household_id: householdId,
        cancelled_at: null,
        OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
      },
      select: { id: true },
    });
    if (!card) redirect("/dashboard/donations?error=Invalid+credit+card");
  } else {
    credit_card_id = null;
  }

  if (payment_method === "bank_account") {
    if (!bank_account_id) redirect("/dashboard/donations?error=Bank+account+required");
    const acct = await prisma.bank_accounts.findFirst({
      where: { id: bank_account_id, household_id: householdId, is_active: true },
      select: { id: true },
    });
    if (!acct) redirect("/dashboard/donations?error=Invalid+bank+account");
  } else {
    bank_account_id = null;
  }

  if (payment_method === "digital_wallet") {
    if (!digital_payment_method_id) redirect("/dashboard/donations?error=Digital+wallet+required");
    const dpm = await prisma.digital_payment_methods.findFirst({
      where: { id: digital_payment_method_id, household_id: householdId, is_active: true },
      select: { id: true },
    });
    if (!dpm) redirect("/dashboard/donations?error=Invalid+digital+wallet");
  } else {
    digital_payment_method_id = null;
  }

  let payee_id: string | null = payee_id_raw;
  if (payee_id) {
    const payee = await prisma.payees.findFirst({
      where: { id: payee_id, household_id: householdId },
    });
    if (!payee) {
      redirect("/dashboard/donations?error=Invalid+linked+payee");
    }
  } else {
    payee_id = null;
  }

  const kind =
    kindRaw === DonationKind.one_time ? DonationKind.one_time : DonationKind.monthly_commitment;

  const base = {
    id: crypto.randomUUID(),
    household_id: householdId,
    kind,
    category,
    organization_name,
    organization_tax_number,
    organization_website_url,
    provides_seif_46_receipts,
    tax_authority_info_passed,
    organization_phone,
    organization_email,
    currency: currency || "ILS",
    family_member_id: family_member_id_raw,
    payment_method,
    credit_card_id,
    bank_account_id,
    digital_payment_method_id,
    payee_id,
    renewal_date,
    notes,
    is_active,
  };

  if (kind === DonationKind.one_time) {
    const donation_date_raw = (formData.get("donation_date") as string | null)?.trim();
    const amountParsed = parseOptionalDecimal(formData.get("one_time_amount") as string | null);
    if (!donation_date_raw) {
      redirect("/dashboard/donations?error=Donation+date+required");
    }
    if (!amountParsed.ok) {
      redirect(`/dashboard/donations?error=${encodeURIComponent(amountParsed.error)}`);
    }
    const donation_date = parseDateOnlyLocalNoon(donation_date_raw);
    if (!donation_date) {
      redirect("/dashboard/donations?error=Invalid+donation+date");
    }

    await prisma.donations.create({
      data: {
        ...base,
        one_time_amount: amountParsed.value,
        donation_date,
        monthly_amount: null,
        commitment_months: null,
        commitment_start_date: null,
      },
    });
  } else {
    const monthlyParsed = parseOptionalDecimal(formData.get("monthly_amount") as string | null);
    const monthsParsed = parsePositiveInt(formData.get("commitment_months") as string | null);
    const startRaw = (formData.get("commitment_start_date") as string | null)?.trim();

    if (!monthlyParsed.ok) {
      redirect(`/dashboard/donations?error=${encodeURIComponent(monthlyParsed.error)}`);
    }
    if (!monthsParsed.ok) {
      redirect(`/dashboard/donations?error=${encodeURIComponent(monthsParsed.error)}`);
    }

    let commitment_start_date: Date | null = null;
    if (startRaw) {
      const parsed = parseDateOnlyLocalNoon(startRaw);
      if (!parsed) {
        redirect("/dashboard/donations?error=Invalid+commitment+start+date");
      }
      commitment_start_date = parsed;
    }

    await prisma.donations.create({
      data: {
        ...base,
        one_time_amount: null,
        donation_date: null,
        monthly_amount: monthlyParsed.value,
        commitment_months: monthsParsed.value,
        commitment_start_date,
      },
    });
  }

  revalidatePath("/dashboard/donations");
  revalidatePath("/dashboard/upcoming-renewals");
  redirect("/dashboard/donations?created=1");
}

export async function updateDonation(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/donations?error=No+household");
  }

  const id = (formData.get("id") as string | null)?.trim();
  const kindRaw = (formData.get("kind") as string | null)?.trim();
  const organization_name = (formData.get("organization_name") as string | null)?.trim();
  const category = (formData.get("category") as string | null)?.trim() || "Other";
  const family_member_id_raw = (formData.get("family_member_id") as string | null)?.trim() || null;
  const payment_method_raw = (formData.get("payment_method") as string | null)?.trim() || null;
  const organization_tax_number =
    (formData.get("organization_tax_number") as string | null)?.trim() || null;
  const organization_website_url =
    (formData.get("organization_website_url") as string | null)?.trim() || null;
  const organization_phone = (formData.get("organization_phone") as string | null)?.trim() || null;
  const organization_email = (formData.get("organization_email") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const payee_id_raw = (formData.get("payee_id") as string | null)?.trim() || null;
  const credit_card_id_raw = (formData.get("credit_card_id") as string | null)?.trim() || null;
  const bank_account_id_raw = (formData.get("bank_account_id") as string | null)?.trim() || null;
  const digital_payment_method_id_raw =
    (formData.get("digital_payment_method_id") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const provides_seif_46_receipts = formData.get("provides_seif_46_receipts") === "on";
  const tax_authority_info_passed = formData.get("tax_authority_info_passed") === "on";
  const statusRaw = (formData.get("status") as string | null)?.trim() || "active";
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim();

  if (!id) {
    redirect("/dashboard/donations?error=Missing+donation+id");
  }

  if (!organization_name) {
    redirect(`/dashboard/donations/${id}?error=Organization+name+required`);
  }

  if (kindRaw !== DonationKind.one_time && kindRaw !== DonationKind.monthly_commitment) {
    redirect(`/dashboard/donations/${id}?error=Invalid+donation+type`);
  }

  if (statusRaw !== "active" && statusRaw !== "historic") {
    redirect(`/dashboard/donations/${id}?error=Invalid+donation+status`);
  }
  const is_active = statusRaw === "active";

  if (!family_member_id_raw) {
    redirect(`/dashboard/donations/${id}?error=Family+member+required`);
  }

  const allowedPaymentMethods: DonationPaymentMethod[] = [
    "cash",
    "credit_card",
    "bank_account",
    "digital_wallet",
    "other",
  ];
  if (!payment_method_raw || !allowedPaymentMethods.includes(payment_method_raw as DonationPaymentMethod)) {
    redirect(`/dashboard/donations/${id}?error=Invalid+payment+method`);
  }
  const payment_method = payment_method_raw as DonationPaymentMethod;

  const today = startOfToday();

  const existing = await prisma.donations.findFirst({
    where: { id, household_id: householdId },
    select: { credit_card_id: true, bank_account_id: true, digital_payment_method_id: true },
  });
  if (!existing) {
    redirect(`/dashboard/donations/${id}?error=Not+found`);
  }

  const member = await prisma.family_members.findFirst({
    where: { id: family_member_id_raw, household_id: householdId },
    select: { id: true },
  });
  if (!member) {
    redirect(`/dashboard/donations/${id}?error=Invalid+family+member`);
  }

  let credit_card_id: string | null = credit_card_id_raw;
  let bank_account_id: string | null = bank_account_id_raw;
  let digital_payment_method_id: string | null = digital_payment_method_id_raw;

  if (payment_method !== "credit_card") credit_card_id = null;
  if (payment_method !== "bank_account") bank_account_id = null;
  if (payment_method !== "digital_wallet") digital_payment_method_id = null;

  if (payment_method === "credit_card") {
    if (!credit_card_id) redirect(`/dashboard/donations/${id}?error=Credit+card+required`);
    const strictCard =
      credit_card_id !== existing.credit_card_id
        ? {
            cancelled_at: null,
            OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
          }
        : {};
    const card = await prisma.credit_cards.findFirst({
      where: { id: credit_card_id, household_id: householdId, ...strictCard },
      select: { id: true },
    });
    if (!card) redirect(`/dashboard/donations/${id}?error=Invalid+credit+card`);
  }

  if (payment_method === "bank_account") {
    if (!bank_account_id) redirect(`/dashboard/donations/${id}?error=Bank+account+required`);
    const strictAcct =
      bank_account_id !== existing.bank_account_id ? { is_active: true } : ({} as const);
    const acct = await prisma.bank_accounts.findFirst({
      where: { id: bank_account_id, household_id: householdId, ...strictAcct },
      select: { id: true },
    });
    if (!acct) redirect(`/dashboard/donations/${id}?error=Invalid+bank+account`);
  }

  if (payment_method === "digital_wallet") {
    if (!digital_payment_method_id)
      redirect(`/dashboard/donations/${id}?error=Digital+wallet+required`);
    const strictDpm =
      digital_payment_method_id !== existing.digital_payment_method_id ? { is_active: true } : ({} as const);
    const dpm = await prisma.digital_payment_methods.findFirst({
      where: { id: digital_payment_method_id, household_id: householdId, ...strictDpm },
      select: { id: true },
    });
    if (!dpm) redirect(`/dashboard/donations/${id}?error=Invalid+digital+wallet`);
  }

  let renewal_date: Date | null = null;
  if (renewal_date_raw) {
    const parsed = parseDateOnlyLocalNoon(renewal_date_raw);
    if (!parsed) {
      redirect(`/dashboard/donations/${id}?error=Invalid+renewal+reminder+date`);
    }
    renewal_date = parsed;
  }

  let payee_id: string | null = payee_id_raw;
  if (payee_id) {
    const payee = await prisma.payees.findFirst({
      where: { id: payee_id, household_id: householdId },
    });
    if (!payee) {
      redirect(`/dashboard/donations/${id}?error=Invalid+linked+payee`);
    }
  } else {
    payee_id = null;
  }

  const kind =
    kindRaw === DonationKind.one_time ? DonationKind.one_time : DonationKind.monthly_commitment;

  const base = {
    kind,
    category,
    organization_name,
    organization_tax_number,
    organization_website_url,
    provides_seif_46_receipts,
    tax_authority_info_passed,
    organization_phone,
    organization_email,
    currency: currency || "ILS",
    family_member_id: family_member_id_raw,
    payment_method,
    credit_card_id,
    bank_account_id,
    digital_payment_method_id,
    payee_id,
    renewal_date,
    notes,
    is_active,
  };

  if (kind === DonationKind.one_time) {
    const donation_date_raw = (formData.get("donation_date") as string | null)?.trim();
    const amountParsed = parseOptionalDecimal(formData.get("one_time_amount") as string | null);
    if (!donation_date_raw) {
      redirect(`/dashboard/donations/${id}?error=Donation+date+required`);
    }
    if (!amountParsed.ok) {
      redirect(`/dashboard/donations/${id}?error=${encodeURIComponent(amountParsed.error)}`);
    }
    const donation_date = parseDateOnlyLocalNoon(donation_date_raw);
    if (!donation_date) {
      redirect(`/dashboard/donations/${id}?error=Invalid+donation+date`);
    }

    await prisma.donations.updateMany({
      where: { id, household_id: householdId },
      data: {
        ...base,
        one_time_amount: amountParsed.value,
        donation_date,
        monthly_amount: null,
        commitment_months: null,
        commitment_start_date: null,
      },
    });
  } else {
    const monthlyParsed = parseOptionalDecimal(formData.get("monthly_amount") as string | null);
    const monthsParsed = parsePositiveInt(formData.get("commitment_months") as string | null);
    const startRaw = (formData.get("commitment_start_date") as string | null)?.trim();

    if (!monthlyParsed.ok) {
      redirect(`/dashboard/donations/${id}?error=${encodeURIComponent(monthlyParsed.error)}`);
    }
    if (!monthsParsed.ok) {
      redirect(`/dashboard/donations/${id}?error=${encodeURIComponent(monthsParsed.error)}`);
    }

    let commitment_start_date: Date | null = null;
    if (startRaw) {
      const parsed = parseDateOnlyLocalNoon(startRaw);
      if (!parsed) {
        redirect(`/dashboard/donations/${id}?error=Invalid+commitment+start+date`);
      }
      commitment_start_date = parsed;
    }

    await prisma.donations.updateMany({
      where: { id, household_id: householdId },
      data: {
        ...base,
        one_time_amount: null,
        donation_date: null,
        monthly_amount: monthlyParsed.value,
        commitment_months: monthsParsed.value,
        commitment_start_date,
      },
    });
  }

  revalidatePath("/dashboard/donations");
  revalidatePath("/dashboard/upcoming-renewals");
  redirect("/dashboard/donations?updated=1");
}

export async function toggleDonationActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/donations?error=No+household");
  }

  await prisma.donations.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/donations");
  revalidatePath("/dashboard/upcoming-renewals");
  redirect("/dashboard/donations?updated=1");
}
