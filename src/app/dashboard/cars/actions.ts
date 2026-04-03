"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

function parseOptionalOdometerKm(raw: string | null): number | null {
  const v = raw?.trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

function parseLitres(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed.toFixed(3);
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

type CarPurchasePaymentMethod = "cash" | "credit_card" | "bank_account" | "other";

async function validateHouseholdRefs(
  householdId: string,
  refs: {
    main_driver_family_member_id?: string | null;
    purchase_credit_card_id?: string | null;
    purchase_bank_account_id?: string | null;
    credit_card_id?: string | null;
    bank_account_id?: string | null;
    car_id?: string | null;
  },
) {
  if (refs.main_driver_family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: refs.main_driver_family_member_id, household_id: householdId, is_active: true },
      select: { id: true },
    });
    if (!member) return "Invalid main driver";
  }
  if (refs.purchase_credit_card_id || refs.credit_card_id) {
    const cardId = refs.purchase_credit_card_id ?? refs.credit_card_id;
    const card = await prisma.credit_cards.findFirst({
      where: { id: cardId!, household_id: householdId },
      select: { id: true },
    });
    if (!card) return "Invalid credit card";
  }
  if (refs.purchase_bank_account_id || refs.bank_account_id) {
    const accountId = refs.purchase_bank_account_id ?? refs.bank_account_id;
    const account = await prisma.bank_accounts.findFirst({
      where: { id: accountId!, household_id: householdId },
      select: { id: true },
    });
    if (!account) return "Invalid bank account";
  }
  if (refs.car_id) {
    const car = await prisma.cars.findFirst({
      where: { id: refs.car_id, household_id: householdId },
      select: { id: true },
    });
    if (!car) return "Invalid car";
  }
  return null;
}

export async function createCar(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/cars?error=No+household");

  const maker = (formData.get("maker") as string | null)?.trim();
  const model = (formData.get("model") as string | null)?.trim();
  const custom_name = (formData.get("custom_name") as string | null)?.trim() || null;
  const model_year_raw = (formData.get("model_year") as string | null)?.trim();
  const plate_number = (formData.get("plate_number") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const purchase_notes = (formData.get("purchase_notes") as string | null)?.trim() || null;
  const main_driver_family_member_id =
    (formData.get("main_driver_family_member_id") as string | null)?.trim() || null;

  const purchase_date = parseDateInput((formData.get("purchase_date") as string | null)?.trim() || null);
  const purchase_amount = parseMoney((formData.get("purchase_amount") as string | null) ?? null);
  const purchased_from = (formData.get("purchased_from") as string | null)?.trim() || null;
  const purchase_odometer_km_raw = (formData.get("purchase_odometer_km") as string | null)?.trim();
  if (purchase_odometer_km_raw) {
    const n = Number(purchase_odometer_km_raw);
    if (!Number.isFinite(n) || n < 0) redirect("/dashboard/cars?error=Invalid+km+at+purchase");
  }
  const purchase_odometer_km = parseOptionalOdometerKm((formData.get("purchase_odometer_km") as string | null) ?? null);
  const extra_purchase_costs = parseMoney((formData.get("extra_purchase_costs") as string | null) ?? null);
  const extra_purchase_costs_notes =
    (formData.get("extra_purchase_costs_notes") as string | null)?.trim() || null;
  const purchase_payment_method_raw =
    (formData.get("purchase_payment_method") as string | null)?.trim() || null;
  let purchase_credit_card_id =
    (formData.get("purchase_credit_card_id") as string | null)?.trim() || null;
  let purchase_bank_account_id =
    (formData.get("purchase_bank_account_id") as string | null)?.trim() || null;

  const sold_at = parseDateInput((formData.get("sold_at") as string | null)?.trim() || null);
  const sold_amount = parseMoney((formData.get("sold_amount") as string | null) ?? null);
  const sold_to = (formData.get("sold_to") as string | null)?.trim() || null;
  const sale_notes = (formData.get("sale_notes") as string | null)?.trim() || null;

  if (!maker || !model) redirect("/dashboard/cars?error=Maker+and+model+are+required");

  let model_year: number | null = null;
  if (model_year_raw) {
    const parsedModelYear = Number(model_year_raw);
    if (!Number.isFinite(parsedModelYear) || parsedModelYear < 1886 || parsedModelYear > 9999) {
      redirect("/dashboard/cars?error=Invalid+model+year");
    }
    model_year = parsedModelYear;
  }

  const allowedMethods: CarPurchasePaymentMethod[] = ["cash", "credit_card", "bank_account", "other"];
  const purchase_payment_method =
    purchase_payment_method_raw && allowedMethods.includes(purchase_payment_method_raw as CarPurchasePaymentMethod)
      ? (purchase_payment_method_raw as CarPurchasePaymentMethod)
      : null;

  if (purchase_payment_method === "credit_card") {
    if (!purchase_credit_card_id) redirect("/dashboard/cars?error=Purchase+credit+card+is+required");
    purchase_bank_account_id = null;
  } else if (purchase_payment_method === "bank_account") {
    if (!purchase_bank_account_id) redirect("/dashboard/cars?error=Purchase+bank+account+is+required");
    purchase_credit_card_id = null;
  } else {
    purchase_credit_card_id = null;
    purchase_bank_account_id = null;
  }

  const error = await validateHouseholdRefs(householdId, {
    main_driver_family_member_id,
    purchase_credit_card_id,
    purchase_bank_account_id,
  });
  if (error) redirect(`/dashboard/cars?error=${encodeURIComponent(error)}`);

  await prisma.cars.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      custom_name,
      maker,
      model,
      model_year,
      plate_number,
      notes,
      main_driver_family_member_id,
      purchase_date,
      purchase_amount,
      purchased_from,
      purchase_odometer_km,
      extra_purchase_costs,
      extra_purchase_costs_notes,
      purchase_notes,
      purchase_payment_method,
      purchase_credit_card_id,
      purchase_bank_account_id,
      sold_at,
      sold_amount,
      sold_to,
      sale_notes,
    },
  });

  revalidatePath("/dashboard/cars");
  redirect("/dashboard/cars?created=1");
}

export async function updateCar(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/cars?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/cars?error=Missing+id");

  const existing = await prisma.cars.findFirst({ where: { id, household_id: householdId }, select: { id: true } });
  if (!existing) redirect("/dashboard/cars?error=Car+not+found");

  const maker = (formData.get("maker") as string | null)?.trim();
  const model = (formData.get("model") as string | null)?.trim();
  const custom_name = (formData.get("custom_name") as string | null)?.trim() || null;
  if (!maker || !model) redirect(`/dashboard/cars/${id}?error=Maker+and+model+are+required`);

  const model_year_raw = (formData.get("model_year") as string | null)?.trim();
  let model_year: number | null = null;
  if (model_year_raw) {
    const parsedModelYear = Number(model_year_raw);
    if (!Number.isFinite(parsedModelYear) || parsedModelYear < 1886 || parsedModelYear > 9999) {
      redirect(`/dashboard/cars/${id}?error=Invalid+model+year`);
    }
    model_year = parsedModelYear;
  }

  const purchase_payment_method_raw =
    (formData.get("purchase_payment_method") as string | null)?.trim() || null;
  let purchase_credit_card_id =
    (formData.get("purchase_credit_card_id") as string | null)?.trim() || null;
  let purchase_bank_account_id =
    (formData.get("purchase_bank_account_id") as string | null)?.trim() || null;
  const allowedMethods: CarPurchasePaymentMethod[] = ["cash", "credit_card", "bank_account", "other"];
  const purchase_payment_method =
    purchase_payment_method_raw && allowedMethods.includes(purchase_payment_method_raw as CarPurchasePaymentMethod)
      ? (purchase_payment_method_raw as CarPurchasePaymentMethod)
      : null;

  if (purchase_payment_method === "credit_card") {
    if (!purchase_credit_card_id) redirect(`/dashboard/cars/${id}?error=Purchase+credit+card+is+required`);
    purchase_bank_account_id = null;
  } else if (purchase_payment_method === "bank_account") {
    if (!purchase_bank_account_id) redirect(`/dashboard/cars/${id}?error=Purchase+bank+account+is+required`);
    purchase_credit_card_id = null;
  } else {
    purchase_credit_card_id = null;
    purchase_bank_account_id = null;
  }

  const main_driver_family_member_id =
    (formData.get("main_driver_family_member_id") as string | null)?.trim() || null;

  const purchase_odometer_km_raw = (formData.get("purchase_odometer_km") as string | null)?.trim();
  if (purchase_odometer_km_raw) {
    const n = Number(purchase_odometer_km_raw);
    if (!Number.isFinite(n) || n < 0) redirect(`/dashboard/cars/${id}?error=Invalid+km+at+purchase`);
  }
  const purchase_odometer_km = parseOptionalOdometerKm((formData.get("purchase_odometer_km") as string | null) ?? null);

  const error = await validateHouseholdRefs(householdId, {
    main_driver_family_member_id,
    purchase_credit_card_id,
    purchase_bank_account_id,
  });
  if (error) redirect(`/dashboard/cars/${id}?error=${encodeURIComponent(error)}`);

  await prisma.cars.updateMany({
    where: { id, household_id: householdId },
    data: {
      maker,
      model,
      custom_name,
      model_year,
      plate_number: (formData.get("plate_number") as string | null)?.trim() || null,
      notes: (formData.get("notes") as string | null)?.trim() || null,
      purchase_date: parseDateInput((formData.get("purchase_date") as string | null)?.trim() || null),
      purchase_amount: parseMoney((formData.get("purchase_amount") as string | null) ?? null),
      purchased_from: (formData.get("purchased_from") as string | null)?.trim() || null,
      purchase_odometer_km,
      extra_purchase_costs: parseMoney((formData.get("extra_purchase_costs") as string | null) ?? null),
      extra_purchase_costs_notes:
        (formData.get("extra_purchase_costs_notes") as string | null)?.trim() || null,
      purchase_notes: (formData.get("purchase_notes") as string | null)?.trim() || null,
      purchase_payment_method,
      purchase_credit_card_id,
      purchase_bank_account_id,
      sold_at: parseDateInput((formData.get("sold_at") as string | null)?.trim() || null),
      sold_amount: parseMoney((formData.get("sold_amount") as string | null) ?? null),
      sold_to: (formData.get("sold_to") as string | null)?.trim() || null,
      sale_notes: (formData.get("sale_notes") as string | null)?.trim() || null,
      main_driver_family_member_id,
    },
  });

  revalidatePath("/dashboard/cars");
  revalidatePath(`/dashboard/cars/${id}`);
  revalidatePath("/dashboard/upcoming-renewals");
  redirect("/dashboard/cars?updated=1");
}

export async function createCarService(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const car_id = (formData.get("car_id") as string | null)?.trim() || null;
  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  const serviced_at = parseDateInput((formData.get("serviced_at") as string | null)?.trim() || null);
  if (!car_id || !provider_name || !serviced_at) return;

  const credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  const bank_account_id = (formData.get("bank_account_id") as string | null)?.trim() || null;
  const error = await validateHouseholdRefs(householdId, { car_id, credit_card_id, bank_account_id });
  if (error) return;

  await prisma.car_services.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      car_id,
      provider_name,
      serviced_at,
      cost_amount: parseMoney((formData.get("cost_amount") as string | null) ?? null),
      odometer_km: (() => {
        const raw = (formData.get("odometer_km") as string | null)?.trim();
        if (!raw) return null;
        const n = Number(raw);
        return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
      })(),
      credit_card_id,
      bank_account_id,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/cars/${car_id}`);
}

export async function deleteCarService(id: string, carId: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;
  await prisma.car_services.deleteMany({
    where: { id, car_id: carId, household_id: householdId },
  });
  revalidatePath(`/dashboard/cars/${carId}`);
}

export async function createCarLicense(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const car_id = (formData.get("car_id") as string | null)?.trim() || null;
  const expires_at = parseDateInput((formData.get("expires_at") as string | null)?.trim() || null);
  if (!car_id || !expires_at) return;

  const credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  const bank_account_id = (formData.get("bank_account_id") as string | null)?.trim() || null;
  const error = await validateHouseholdRefs(householdId, { car_id, credit_card_id, bank_account_id });
  if (error) return;

  await prisma.car_licenses.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      car_id,
      renewed_at: parseDateInput((formData.get("renewed_at") as string | null)?.trim() || null),
      expires_at,
      cost_amount: parseMoney((formData.get("cost_amount") as string | null) ?? null),
      credit_card_id,
      bank_account_id,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/cars/${car_id}`);
  revalidatePath("/dashboard/upcoming-renewals");
}

export async function deleteCarLicense(id: string, carId: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;
  await prisma.car_licenses.deleteMany({
    where: { id, car_id: carId, household_id: householdId },
  });
  revalidatePath(`/dashboard/cars/${carId}`);
  revalidatePath("/dashboard/upcoming-renewals");
}

export async function createCarPetrolFillup(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const car_id = (formData.get("car_id") as string | null)?.trim() || null;
  const filled_at = parseDateInput((formData.get("filled_at") as string | null)?.trim() || null);
  const amount_paid = parseMoney((formData.get("amount_paid") as string | null) ?? null);
  const litres = parseLitres((formData.get("litres") as string | null) ?? null);
  const odometerRaw = (formData.get("odometer_km") as string | null)?.trim();
  const odometer_km =
    odometerRaw != null && odometerRaw !== ""
      ? (() => {
          const n = Number(odometerRaw);
          return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
        })()
      : null;

  if (!car_id || !filled_at || !amount_paid || !litres || odometer_km === null) {
    const msg = "Date, amount, litres, and odometer are required.";
    if (car_id) redirect(`/dashboard/cars/${car_id}?error=${encodeURIComponent(msg)}`);
    redirect(`/dashboard/cars?error=${encodeURIComponent(msg)}`);
  }

  const err = await validateHouseholdRefs(householdId, { car_id });
  if (err) redirect(`/dashboard/cars/${car_id}?error=${encodeURIComponent(err)}`);

  const linked_transaction_id = await resolveTransactionLink(
    householdId,
    formData.get("linked_transaction_id") as string,
  );
  if (linked_transaction_id) {
    const taken = await prisma.car_petrol_fillups.findFirst({
      where: { transaction_id: linked_transaction_id },
      select: { id: true },
    });
    if (taken) {
      redirect(
        `/dashboard/cars/${car_id}?error=${encodeURIComponent("That transaction is already linked to another petrol record.")}`,
      );
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
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/cars/${car_id}`);
}

export async function deleteCarPetrolFillup(id: string, carId: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;
  await prisma.car_petrol_fillups.deleteMany({
    where: { id, car_id: carId, household_id: householdId },
  });
  revalidatePath(`/dashboard/cars/${carId}`);
}
