"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { DonationKind } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function createDonation(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/donations?error=No+household");
  }

  const kindRaw = (formData.get("kind") as string | null)?.trim();
  const organization_name = (formData.get("organization_name") as string | null)?.trim();
  const organization_tax_number =
    (formData.get("organization_tax_number") as string | null)?.trim() || null;
  const organization_phone = (formData.get("organization_phone") as string | null)?.trim() || null;
  const organization_email = (formData.get("organization_email") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const payee_id_raw = (formData.get("payee_id") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const provides_seif_46_receipts = formData.get("provides_seif_46_receipts") === "on";
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim();
  let renewal_date: Date | null = null;
  if (renewal_date_raw) {
    renewal_date = new Date(renewal_date_raw);
    if (Number.isNaN(renewal_date.getTime())) {
      redirect("/dashboard/donations?error=Invalid+renewal+reminder+date");
    }
  }

  if (!organization_name) {
    redirect("/dashboard/donations?error=Organization+name+required");
  }

  if (kindRaw !== DonationKind.one_time && kindRaw !== DonationKind.monthly_commitment) {
    redirect("/dashboard/donations?error=Invalid+donation+type");
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
    organization_name,
    organization_tax_number,
    provides_seif_46_receipts,
    organization_phone,
    organization_email,
    currency: currency || "ILS",
    payee_id,
    renewal_date,
    notes,
    is_active: true,
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
    const donation_date = new Date(donation_date_raw);
    if (Number.isNaN(donation_date.getTime())) {
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
      commitment_start_date = new Date(startRaw);
      if (Number.isNaN(commitment_start_date.getTime())) {
        redirect("/dashboard/donations?error=Invalid+commitment+start+date");
      }
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
