"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PROPERTIES_PATH_PREFIX = "/dashboard/properties";

function safePropertiesRedirectPath(raw: string | null | undefined, fallback: string): string {
  const t = raw?.trim() || "";
  if (!t.startsWith(PROPERTIES_PATH_PREFIX)) return fallback;
  if (t.includes("\n") || t.includes("\r")) return fallback;
  if (t.includes("//")) return fallback;
  return t;
}

function redirectWithError(basePath: string, message: string): never {
  const u = new URL(basePath, "http://local.invalid");
  u.searchParams.set("error", message);
  redirect(`${u.pathname}${u.search}`);
}

function redirectToPropertyRentals(
  property_id: string,
  params: { rentalId?: string; updated?: string; created?: string } = {},
): never {
  const u = new URL(`${PROPERTIES_PATH_PREFIX}/${property_id}/rentals`, "http://local.invalid");
  if (params.rentalId) u.searchParams.set("rentalId", params.rentalId);
  if (params.updated) u.searchParams.set("updated", params.updated);
  if (params.created) u.searchParams.set("created", params.created);
  redirect(`${u.pathname}${u.search}`);
}

export async function createProperty(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  const defaultError = "/dashboard/properties?modal=new";
  const redirectOnError = safePropertiesRedirectPath(
    formData.get("redirect_on_error") as string | null,
    defaultError,
  );
  if (!householdId) redirectWithError(redirectOnError, "No household");

  const name = (formData.get("name") as string | null)?.trim();
  const property_type = (formData.get("property_type") as string | null)?.trim() || null;
  const address = (formData.get("address") as string | null)?.trim() || null;
  const landlord_name = (formData.get("landlord_name") as string | null)?.trim() || null;
  const landlord_contact = (formData.get("landlord_contact") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!name) {
    redirectWithError(redirectOnError, "Name is required");
  }

  await prisma.properties.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      property_type,
      address,
      landlord_name,
      landlord_contact,
      notes,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/properties");
  const redirectOnSuccess = safePropertiesRedirectPath(
    formData.get("redirect_on_success") as string | null,
    "/dashboard/properties?created=1",
  );
  redirect(redirectOnSuccess);
}

export async function updateProperty(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/properties?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/properties?error=Missing+id");

  const prop = await prisma.properties.findFirst({
    where: { id, household_id: householdId },
  });
  if (!prop) redirect("/dashboard/properties?error=Not+found");

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) {
    redirect(`/dashboard/properties/${id}?error=Name+is+required`);
  }

  const property_type = (formData.get("property_type") as string | null)?.trim() || null;
  const address = (formData.get("address") as string | null)?.trim() || null;
  const landlord_name = (formData.get("landlord_name") as string | null)?.trim() || null;
  const landlord_contact = (formData.get("landlord_contact") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  await prisma.properties.updateMany({
    where: { id, household_id: householdId },
    data: {
      name,
      property_type,
      address,
      landlord_name,
      landlord_contact,
      notes,
    },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${id}`);
  redirect("/dashboard/properties?updated=1");
}

const UTILITY_TYPES = ["electricity", "water", "internet", "telephone", "gas", "arnona", "other"] as const;
type UtilityType = (typeof UTILITY_TYPES)[number];

function isUtilityType(s: string | null): s is UtilityType {
  return !!s && UTILITY_TYPES.includes(s as UtilityType);
}

function parseUtilityType(s: string | null): UtilityType {
  if (isUtilityType(s)) return s;
  return "electricity";
}

function parseOptionalUtilityDate(raw: string | null): { value: Date | null; invalid: boolean } {
  const t = raw?.trim() || "";
  if (!t) return { value: null, invalid: false };
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return { value: null, invalid: true };
  return { value: d, invalid: false };
}

export async function createUtility(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/properties?error=No+household");

  const property_id = (formData.get("property_id") as string | null)?.trim();
  const fallbackPropertyPath = property_id
    ? `${PROPERTIES_PATH_PREFIX}/${property_id}`
    : PROPERTIES_PATH_PREFIX;
  const redirectOnError = safePropertiesRedirectPath(
    formData.get("redirect_on_error") as string | null,
    `${fallbackPropertyPath}?modal=utility-new`,
  );
  const redirectOnSuccess = safePropertiesRedirectPath(
    formData.get("redirect_on_success") as string | null,
    `${fallbackPropertyPath}?created=utility`,
  );

  if (!property_id) redirectWithError(redirectOnError, "Missing property");

  const prop = await prisma.properties.findFirst({
    where: { id: property_id, household_id: householdId },
  });
  if (!prop) redirectWithError(redirectOnError, "Not found");

  const utilityTypeRaw = (formData.get("utility_type") as string | null)?.trim() || null;
  if (!isUtilityType(utilityTypeRaw)) redirectWithError(redirectOnError, "Utility type is required");
  const utility_type = utilityTypeRaw;
  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  if (!provider_name) redirectWithError(redirectOnError, "Provider name is required");

  const payee_id = (formData.get("payee_id") as string | null)?.trim() || null;
  const account_number = (formData.get("account_number") as string | null)?.trim() || null;
  const meter_number = (formData.get("meter_number") as string | null)?.trim() || null;
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim() || null;
  const start_date_raw = (formData.get("start_date") as string | null)?.trim() || null;
  const website_url = (formData.get("website_url") as string | null)?.trim() || null;
  const contact_phone = (formData.get("contact_phone") as string | null)?.trim() || null;
  const contact_email = (formData.get("contact_email") as string | null)?.trim() || null;
  const facebook_url = (formData.get("facebook_url") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (payee_id) {
    const payee = await prisma.payees.findFirst({
      where: { id: payee_id, household_id: householdId },
    });
    if (!payee) redirectWithError(redirectOnError, "Invalid payee");
  }

  const renewal_date = renewal_date_raw ? new Date(renewal_date_raw) : null;
  if (renewal_date_raw && Number.isNaN(renewal_date?.getTime())) {
    redirectWithError(redirectOnError, "Invalid renewal date");
  }

  const startParsed = parseOptionalUtilityDate(start_date_raw);
  if (startParsed.invalid) redirectWithError(redirectOnError, "Invalid start date");

  await prisma.property_utilities.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      property_id,
      utility_type,
      provider_name,
      payee_id: payee_id || null,
      account_number,
      meter_number,
      renewal_date,
      start_date: startParsed.value,
      website_url,
      contact_phone,
      contact_email,
      facebook_url,
      notes,
    },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${property_id}`);
  revalidatePath(`/dashboard/properties/${property_id}/rentals`);
  redirect(redirectOnSuccess);
}

export async function updateUtility(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/properties?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  const property_id = (formData.get("property_id") as string | null)?.trim();
  if (!id || !property_id) redirect("/dashboard/properties?error=Missing+utility+id");

  const util = await prisma.property_utilities.findFirst({
    where: { id, household_id: householdId, property_id },
  });
  if (!util) redirect("/dashboard/properties?error=Utility+not+found");

  const utility_type = parseUtilityType((formData.get("utility_type") as string | null)?.trim() || null);
  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  if (!provider_name) redirect(`/dashboard/properties/${property_id}/utilities/${id}/edit?error=Provider+name+is+required`);

  const payee_id = (formData.get("payee_id") as string | null)?.trim() || null;
  const account_number = (formData.get("account_number") as string | null)?.trim() || null;
  const meter_number = (formData.get("meter_number") as string | null)?.trim() || null;
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim() || null;
  const start_date_raw = (formData.get("start_date") as string | null)?.trim() || null;
  const website_url = (formData.get("website_url") as string | null)?.trim() || null;
  const contact_phone = (formData.get("contact_phone") as string | null)?.trim() || null;
  const contact_email = (formData.get("contact_email") as string | null)?.trim() || null;
  const facebook_url = (formData.get("facebook_url") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  let finalPayeeId: string | null = null;
  if (payee_id) {
    const payee = await prisma.payees.findFirst({
      where: { id: payee_id, household_id: householdId },
    });
    if (!payee) redirect(`/dashboard/properties/${property_id}/utilities/${id}/edit?error=Invalid+payee`);
    finalPayeeId = payee_id;
  }

  const renewal_date = renewal_date_raw ? new Date(renewal_date_raw) : null;
  if (renewal_date_raw && Number.isNaN(renewal_date?.getTime())) {
    redirect(`/dashboard/properties/${property_id}/utilities/${id}/edit?error=Invalid+renewal+date`);
  }

  const startParsed = parseOptionalUtilityDate(start_date_raw);
  if (startParsed.invalid) {
    redirect(`/dashboard/properties/${property_id}/utilities/${id}/edit?error=Invalid+start+date`);
  }

  await prisma.property_utilities.updateMany({
    where: { id, household_id: householdId },
    data: {
      utility_type,
      provider_name,
      payee_id: finalPayeeId,
      account_number,
      meter_number,
      renewal_date,
      start_date: startParsed.value,
      website_url,
      contact_phone,
      contact_email,
      facebook_url,
      notes,
    },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${property_id}`);
  revalidatePath(`/dashboard/properties/${property_id}/utilities/${id}/edit`);
  redirect(`/dashboard/properties/${property_id}?updated=utility`);
}

export async function deleteUtility(id: string, property_id: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  await prisma.property_utilities.deleteMany({
    where: { id, household_id: householdId, property_id },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${property_id}`);
  revalidatePath(`/dashboard/properties/${property_id}/rentals`);
}

const RENTAL_TYPES = ["lease_monthly", "short_stay"] as const;
const RENTAL_PAYMENT_METHODS = ["cash", "credit_card", "bank_account", "other"] as const;
type RentalType = (typeof RENTAL_TYPES)[number];
type RentalPaymentMethod = (typeof RENTAL_PAYMENT_METHODS)[number];

function parseDateInput(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseRentalType(raw: string | null): RentalType {
  if (raw === "long_term") return "lease_monthly";
  if (raw === "short_term") return "short_stay";
  if (raw && RENTAL_TYPES.includes(raw as RentalType)) return raw as RentalType;
  return "lease_monthly";
}

function parseRentalPaymentMethod(raw: string | null): RentalPaymentMethod | null {
  if (!raw) return null;
  if (RENTAL_PAYMENT_METHODS.includes(raw as RentalPaymentMethod)) return raw as RentalPaymentMethod;
  return null;
}

function parseMoney(raw: string | null): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export async function createRental(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();

  const property_id = (formData.get("property_id") as string | null)?.trim();
  const rentalsBase = property_id
    ? `${PROPERTIES_PATH_PREFIX}/${property_id}/rentals`
    : PROPERTIES_PATH_PREFIX;
  const redirectOnError = safePropertiesRedirectPath(
    formData.get("redirect_on_error") as string | null,
    `${rentalsBase}?modal=new`,
  );

  if (!householdId) redirectWithError(redirectOnError, "No household");
  if (!property_id) redirectWithError(redirectOnError, "Missing property");

  const property = await prisma.properties.findFirst({
    where: { id: property_id, household_id: householdId },
    select: { id: true },
  });
  if (!property) redirectWithError(redirectOnError, "Not found");

  const rental_type = parseRentalType((formData.get("rental_type") as string | null)?.trim() || null);
  const start_date = parseDateInput((formData.get("start_date") as string | null)?.trim() || null);
  const end_date = parseDateInput((formData.get("end_date") as string | null)?.trim() || null);
  const monthly_payment = parseMoney((formData.get("monthly_payment") as string | null) ?? null);
  const period_total_payment = parseMoney((formData.get("period_total_payment") as string | null) ?? null);
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const payment_method = parseRentalPaymentMethod((formData.get("payment_method") as string | null)?.trim() || null);
  let credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  let bank_account_id = (formData.get("bank_account_id") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const is_clinic_lease = formData.has("is_clinic_lease");

  if (rental_type === "lease_monthly" && !monthly_payment) {
    redirectWithError(redirectOnError, "Monthly payment is required for lease rentals");
  }
  if (rental_type === "short_stay" && !period_total_payment) {
    redirectWithError(redirectOnError, "Total payment is required for short stay rentals");
  }
  if (payment_method !== "credit_card") credit_card_id = null;
  if (payment_method !== "bank_account") bank_account_id = null;

  if (credit_card_id) {
    const card = await prisma.credit_cards.findFirst({
      where: { id: credit_card_id, household_id: householdId },
      select: { id: true },
    });
    if (!card) redirectWithError(redirectOnError, "Credit card not found");
  }

  if (bank_account_id) {
    const account = await prisma.bank_accounts.findFirst({
      where: { id: bank_account_id, household_id: householdId },
      select: { id: true },
    });
    if (!account) redirectWithError(redirectOnError, "Bank account not found");
  }

  const id = crypto.randomUUID();
  await prisma.rentals.create({
    data: {
      id,
      household_id: householdId,
      property_id,
      rental_type,
      start_date,
      end_date,
      monthly_payment,
      period_total_payment,
      currency,
      payment_method,
      credit_card_id,
      bank_account_id,
      notes,
      is_clinic_lease,
    },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${property_id}`);
  revalidatePath(`/dashboard/properties/${property_id}/rentals`);
  revalidatePath("/dashboard/private-clinic/reminders");

  const redirectOnSuccess = safePropertiesRedirectPath(
    formData.get("redirect_on_success") as string | null,
    `${rentalsBase}?created=1&rentalId=${encodeURIComponent(id)}`,
  );
  redirect(redirectOnSuccess);
}

export async function updateRental(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const id = (formData.get("id") as string | null)?.trim();
  const property_id = (formData.get("property_id") as string | null)?.trim();
  if (!id || !property_id) return;

  const existing = await prisma.rentals.findFirst({
    where: { id, household_id: householdId, property_id },
    select: { id: true },
  });
  if (!existing) return;

  const rental_type = parseRentalType((formData.get("rental_type") as string | null)?.trim() || null);
  const start_date = parseDateInput((formData.get("start_date") as string | null)?.trim() || null);
  const end_date = parseDateInput((formData.get("end_date") as string | null)?.trim() || null);
  const monthly_payment = parseMoney((formData.get("monthly_payment") as string | null) ?? null);
  const period_total_payment = parseMoney((formData.get("period_total_payment") as string | null) ?? null);
  const currency = (formData.get("currency") as string | null)?.trim() || "ILS";
  const payment_method = parseRentalPaymentMethod((formData.get("payment_method") as string | null)?.trim() || null);
  let credit_card_id = (formData.get("credit_card_id") as string | null)?.trim() || null;
  let bank_account_id = (formData.get("bank_account_id") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const is_clinic_lease = formData.has("is_clinic_lease");

  if (rental_type === "lease_monthly" && !monthly_payment) return;
  if (rental_type === "short_stay" && !period_total_payment) return;
  if (payment_method !== "credit_card") credit_card_id = null;
  if (payment_method !== "bank_account") bank_account_id = null;

  if (credit_card_id) {
    const card = await prisma.credit_cards.findFirst({
      where: { id: credit_card_id, household_id: householdId },
      select: { id: true },
    });
    if (!card) return;
  }

  if (bank_account_id) {
    const account = await prisma.bank_accounts.findFirst({
      where: { id: bank_account_id, household_id: householdId },
      select: { id: true },
    });
    if (!account) return;
  }

  await prisma.rentals.updateMany({
    where: { id, household_id: householdId },
    data: {
      rental_type,
      start_date,
      end_date,
      monthly_payment,
      period_total_payment,
      currency,
      payment_method,
      credit_card_id,
      bank_account_id,
      notes,
      is_clinic_lease,
    },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${property_id}`);
  revalidatePath(`/dashboard/properties/${property_id}/rentals`);
  revalidatePath("/dashboard/private-clinic/reminders");

  redirectToPropertyRentals(property_id, { rentalId: id, updated: "1" });
}

export async function deleteRental(id: string, property_id: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  await prisma.rentals.deleteMany({
    where: { id, household_id: householdId, property_id },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${property_id}`);
}

export async function createRentalTenant(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const rental_id = (formData.get("rental_id") as string | null)?.trim();
  const full_name = (formData.get("full_name") as string | null)?.trim();
  if (!rental_id || !full_name) return;

  const rental = await prisma.rentals.findFirst({
    where: { id: rental_id, household_id: householdId },
    select: { property_id: true },
  });
  if (!rental) return;

  await prisma.rental_tenants.create({
    data: {
      id: crypto.randomUUID(),
      rental_id,
      full_name,
      email: (formData.get("email") as string | null)?.trim() || null,
      phone: (formData.get("phone") as string | null)?.trim() || null,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/properties/${rental.property_id}`);
  revalidatePath(`/dashboard/properties/${rental.property_id}/rentals`);
  redirectToPropertyRentals(rental.property_id, { rentalId: rental_id, updated: "1" });
}

export async function updateRentalTenant(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const id = (formData.get("id") as string | null)?.trim();
  const full_name = (formData.get("full_name") as string | null)?.trim();
  if (!id || !full_name) return;

  const tenant = await prisma.rental_tenants.findFirst({
    where: { id, rental: { household_id: householdId } },
    select: { rental: { select: { property_id: true, id: true } } },
  });
  if (!tenant) return;

  await prisma.rental_tenants.update({
    where: { id },
    data: {
      full_name,
      email: (formData.get("email") as string | null)?.trim() || null,
      phone: (formData.get("phone") as string | null)?.trim() || null,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/properties/${tenant.rental.property_id}`);
  revalidatePath(`/dashboard/properties/${tenant.rental.property_id}/rentals`);
  redirectToPropertyRentals(tenant.rental.property_id, { rentalId: tenant.rental.id, updated: "1" });
}

export async function deleteRentalTenant(id: string, property_id: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const tenant = await prisma.rental_tenants.findFirst({
    where: { id, rental: { household_id: householdId } },
    select: { id: true },
  });
  if (!tenant) return;

  await prisma.rental_tenants.delete({ where: { id } });
  revalidatePath(`/dashboard/properties/${property_id}`);
  revalidatePath(`/dashboard/properties/${property_id}/rentals`);
}

export async function createRentalUtility(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const rental_id = (formData.get("rental_id") as string | null)?.trim();
  const utility_company = (formData.get("utility_company") as string | null)?.trim();
  if (!rental_id || !utility_company) return;

  const rental = await prisma.rentals.findFirst({
    where: { id: rental_id, household_id: householdId },
    select: { property_id: true },
  });
  if (!rental) return;

  await prisma.rental_utilities.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      rental_id,
      utility_type: parseUtilityType((formData.get("utility_type") as string | null)?.trim() || null),
      utility_company,
      account_number: (formData.get("account_number") as string | null)?.trim() || null,
      meter_number: (formData.get("meter_number") as string | null)?.trim() || null,
      last_meter_reading: (formData.get("last_meter_reading") as string | null)?.trim() || null,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/properties/${rental.property_id}`);
  revalidatePath(`/dashboard/properties/${rental.property_id}/rentals`);
  redirectToPropertyRentals(rental.property_id, { rentalId: rental_id, updated: "1" });
}

export async function updateRentalUtility(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const id = (formData.get("id") as string | null)?.trim();
  const utility_company = (formData.get("utility_company") as string | null)?.trim();
  if (!id || !utility_company) return;

  const utility = await prisma.rental_utilities.findFirst({
    where: { id, household_id: householdId },
    select: { rental_id: true, rental: { select: { property_id: true } } },
  });
  if (!utility) return;

  await prisma.rental_utilities.updateMany({
    where: { id, household_id: householdId },
    data: {
      utility_type: parseUtilityType((formData.get("utility_type") as string | null)?.trim() || null),
      utility_company,
      account_number: (formData.get("account_number") as string | null)?.trim() || null,
      meter_number: (formData.get("meter_number") as string | null)?.trim() || null,
      last_meter_reading: (formData.get("last_meter_reading") as string | null)?.trim() || null,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/properties/${utility.rental.property_id}`);
  revalidatePath(`/dashboard/properties/${utility.rental.property_id}/rentals`);
  redirectToPropertyRentals(utility.rental.property_id, { rentalId: utility.rental_id, updated: "1" });
}

export async function deleteRentalUtility(id: string, property_id: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  await prisma.rental_utilities.deleteMany({
    where: { id, household_id: householdId, rental: { property_id } },
  });

  revalidatePath(`/dashboard/properties/${property_id}`);
  revalidatePath(`/dashboard/properties/${property_id}/rentals`);
}

export async function deleteRentalContract(id: string, property_id: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  await prisma.rental_contracts.deleteMany({
    where: { id, household_id: householdId },
  });
  revalidatePath(`/dashboard/properties/${property_id}`);
  revalidatePath(`/dashboard/properties/${property_id}/rentals`);
}
