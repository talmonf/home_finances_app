"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseDateOnlyLocalNoon(raw: string): Date | null {
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const d = new Date(year, monthIndex, day, 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseRequiredDecimal(raw: string | null): { ok: true; value: string } | { ok: false; error: string } {
  const t = raw?.trim() ?? "";
  if (!t) return { ok: false, error: "Loan amount required" };
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Invalid loan amount" };
  return { ok: true, value: n.toFixed(2) };
}

function parseNullableDecimal(raw: string | null): { ok: true; value: string | null } | { ok: false; error: string } {
  const t = raw?.trim() ?? "";
  if (!t) return { ok: true, value: null };
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Invalid amount" };
  return { ok: true, value: n.toFixed(2) };
}

function parseRepaymentDay(raw: string | null): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw?.trim() ?? "";
  if (!t) return { ok: true, value: null };
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1 || n > 31) {
    return { ok: false, error: "Repayment day must be between 1 and 31" };
  }
  return { ok: true, value: n };
}

export async function createLoan(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/loans?error=No+household");
  }

  const loan_date_raw = (formData.get("loan_date") as string | null)?.trim();
  const institution_name = (formData.get("institution_name") as string | null)?.trim();
  const loan_number = (formData.get("loan_number") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const purpose = (formData.get("purpose") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const statusRaw = (formData.get("status") as string | null)?.trim() || "active";
  const maturity_date_raw = (formData.get("maturity_date") as string | null)?.trim();

  if (!loan_date_raw) {
    redirect("/dashboard/loans?error=Loan+date+required");
  }
  if (!institution_name) {
    redirect("/dashboard/loans?error=Institution+name+required");
  }
  if (statusRaw !== "active" && statusRaw !== "historic") {
    redirect("/dashboard/loans?error=Invalid+status");
  }
  const is_active = statusRaw === "active";

  const loan_date = parseDateOnlyLocalNoon(loan_date_raw);
  if (!loan_date) {
    redirect("/dashboard/loans?error=Invalid+loan+date");
  }

  const loanAmountParsed = parseRequiredDecimal(formData.get("loan_amount") as string | null);
  if (!loanAmountParsed.ok) {
    redirect(`/dashboard/loans?error=${encodeURIComponent(loanAmountParsed.error)}`);
  }

  const monthlyParsed = parseNullableDecimal(formData.get("monthly_repayment_amount") as string | null);
  if (!monthlyParsed.ok) {
    redirect(`/dashboard/loans?error=${encodeURIComponent(monthlyParsed.error)}`);
  }

  const totalParsed = parseNullableDecimal(formData.get("total_repayment_amount") as string | null);
  if (!totalParsed.ok) {
    redirect(`/dashboard/loans?error=${encodeURIComponent(totalParsed.error)}`);
  }

  const dayParsed = parseRepaymentDay(formData.get("repayment_day_of_month") as string | null);
  if (!dayParsed.ok) {
    redirect(`/dashboard/loans?error=${encodeURIComponent(dayParsed.error)}`);
  }

  let maturity_date: Date | null = null;
  if (maturity_date_raw) {
    const parsed = parseDateOnlyLocalNoon(maturity_date_raw);
    if (!parsed) {
      redirect("/dashboard/loans?error=Invalid+maturity+date");
    }
    maturity_date = parsed;
  }

  await prisma.loans.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      loan_date,
      loan_amount: loanAmountParsed.value,
      currency: currency || "ILS",
      institution_name,
      loan_number,
      monthly_repayment_amount: monthlyParsed.value,
      repayment_day_of_month: dayParsed.value,
      maturity_date,
      total_repayment_amount: totalParsed.value,
      purpose,
      notes,
      is_active,
    },
  });

  revalidatePath("/dashboard/loans");
  revalidatePath("/dashboard/upcoming-renewals");
  redirect("/dashboard/loans?created=1");
}

export async function updateLoan(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/loans?error=No+household");
  }

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) {
    redirect("/dashboard/loans?error=Missing+loan+id");
  }

  const loan_date_raw = (formData.get("loan_date") as string | null)?.trim();
  const institution_name = (formData.get("institution_name") as string | null)?.trim();
  const loan_number = (formData.get("loan_number") as string | null)?.trim() || null;
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const purpose = (formData.get("purpose") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const statusRaw = (formData.get("status") as string | null)?.trim() || "active";
  const maturity_date_raw = (formData.get("maturity_date") as string | null)?.trim();

  if (!loan_date_raw) {
    redirect(`/dashboard/loans/${id}?error=Loan+date+required`);
  }
  if (!institution_name) {
    redirect(`/dashboard/loans/${id}?error=Institution+name+required`);
  }
  if (statusRaw !== "active" && statusRaw !== "historic") {
    redirect(`/dashboard/loans/${id}?error=Invalid+status`);
  }
  const is_active = statusRaw === "active";

  const existing = await prisma.loans.findFirst({
    where: { id, household_id: householdId },
    select: { id: true },
  });
  if (!existing) {
    redirect(`/dashboard/loans/${id}?error=Not+found`);
  }

  const loan_date = parseDateOnlyLocalNoon(loan_date_raw);
  if (!loan_date) {
    redirect(`/dashboard/loans/${id}?error=Invalid+loan+date`);
  }

  const loanAmountParsed = parseRequiredDecimal(formData.get("loan_amount") as string | null);
  if (!loanAmountParsed.ok) {
    redirect(`/dashboard/loans/${id}?error=${encodeURIComponent(loanAmountParsed.error)}`);
  }

  const monthlyParsed = parseNullableDecimal(formData.get("monthly_repayment_amount") as string | null);
  if (!monthlyParsed.ok) {
    redirect(`/dashboard/loans/${id}?error=${encodeURIComponent(monthlyParsed.error)}`);
  }

  const totalParsed = parseNullableDecimal(formData.get("total_repayment_amount") as string | null);
  if (!totalParsed.ok) {
    redirect(`/dashboard/loans/${id}?error=${encodeURIComponent(totalParsed.error)}`);
  }

  const dayParsed = parseRepaymentDay(formData.get("repayment_day_of_month") as string | null);
  if (!dayParsed.ok) {
    redirect(`/dashboard/loans/${id}?error=${encodeURIComponent(dayParsed.error)}`);
  }

  let maturity_date: Date | null = null;
  if (maturity_date_raw) {
    const parsed = parseDateOnlyLocalNoon(maturity_date_raw);
    if (!parsed) {
      redirect(`/dashboard/loans/${id}?error=Invalid+maturity+date`);
    }
    maturity_date = parsed;
  }

  await prisma.loans.updateMany({
    where: { id, household_id: householdId },
    data: {
      loan_date,
      loan_amount: loanAmountParsed.value,
      currency: currency || "ILS",
      institution_name,
      loan_number,
      monthly_repayment_amount: monthlyParsed.value,
      repayment_day_of_month: dayParsed.value,
      maturity_date,
      total_repayment_amount: totalParsed.value,
      purpose,
      notes,
      is_active,
    },
  });

  revalidatePath("/dashboard/loans");
  revalidatePath(`/dashboard/loans/${id}`);
  revalidatePath("/dashboard/upcoming-renewals");
  redirect(`/dashboard/loans/${id}?updated=1`);
}
