import type {
  TherapyReceiptPaymentMethod,
  TherapyTreatmentPaymentMethod,
  TherapyVisitType,
} from "@/generated/prisma/enums";
import { matchIntakeClients } from "@/lib/therapy/intake-client-match";
import { parseTherapyOccurredAtFromForm } from "@/lib/therapy/occurred-at-form";
import {
  bearerTokenFromAuthorization,
  hashTreatmentIntakeToken,
  IntakeImportKeyConflict,
  parseIntakeAmount,
  type IntakeAccount,
  type IntakeClientRow,
} from "@/lib/therapy/treatment-intake";

export const RECEIPT_INTAKE_PATH = "/api/private-clinic/intake/receipts";

export function receiptIntakeWebhookUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}${RECEIPT_INTAKE_PATH}`;
}

export function receiptIntakeImportKey(userId: string, externalId: string): string {
  return `gform-receipt:${userId}:${externalId}`;
}

const DATE_FIELDS = [
  "treatment_date",
  "treatment_date_2",
  "treatment_date_3",
  "treatment_date_4",
] as const;

export type ReceiptIntakePayment =
  | { kind: "cash" }
  | { kind: "bank_transfer" }
  | { kind: "digital"; name: "Bit" | "Paybox" };

export function parseReceiptIntakePaymentMethod(
  raw: string,
): ReceiptIntakePayment | null {
  const key = raw.trim().toLocaleLowerCase("en-US");
  if (key === "cash") return { kind: "cash" };
  if (key === "bank transfer" || key === "bank_transfer") return { kind: "bank_transfer" };
  if (key === "bit") return { kind: "digital", name: "Bit" };
  if (key === "paybox") return { kind: "digital", name: "Paybox" };
  return null;
}

/** Split a money total into `count` parts. The last part keeps the leftover agorot. */
export function splitReceiptAmount(total: string, count: number): string[] {
  if (count < 1) return [];
  const cents = Math.round(Number(total) * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, index) => {
    const share = base + (index === count - 1 ? remainder : 0);
    return (share / 100).toFixed(2);
  });
}

export type ReceiptIntakeBundle = {
  id: string;
  treatment_ids: string[];
};

export type ReceiptIntakeInsert = {
  receipt: {
    id: string;
    household_id: string;
    job_id: string;
    client_id: string;
    family_id: string | null;
    program_id: string | null;
    receipt_number: string;
    issued_at: Date;
    payment_date: Date;
    total_amount: string;
    net_amount: string;
    currency: string;
    recipient_type: "client";
    receipt_kind: "regular";
    payment_method: TherapyReceiptPaymentMethod;
    notes: string | null;
    import_key: string;
    receipt_number_source: "manual";
  };
  treatments: Array<{
    id: string;
    household_id: string;
    client_id: string;
    family_id: string | null;
    job_id: string;
    program_id: string | null;
    occurred_at: Date;
    amount: string;
    currency: string;
    visit_type: TherapyVisitType;
    payment_date: Date;
    payment_method: TherapyTreatmentPaymentMethod;
    payment_digital_payment_method_id: string | null;
    reported_to_external_system: boolean;
    import_key: string;
  }>;
  allocations: Array<{
    id: string;
    household_id: string;
    receipt_id: string;
    treatment_id: string;
    amount: string;
  }>;
};

export type ReceiptIntakeStore = {
  accountForTokenHash(hash: string): Promise<IntakeAccount | null>;
  activeClients(householdId: string, familyMemberId: string): Promise<IntakeClientRow[]>;
  job(
    householdId: string,
    jobId: string,
    familyMemberId: string,
  ): Promise<{ id: string; external_reporting_system: string | null } | null>;
  programCount(householdId: string, jobId: string): Promise<number>;
  programBelongsToJob(householdId: string, programId: string, jobId: string): Promise<boolean>;
  findDigitalPaymentMethod(
    householdId: string,
    familyMemberId: string,
    name: "Bit" | "Paybox",
  ): Promise<string | null>;
  receiptNumberAvailable(householdId: string, receiptNumber: string, issuedAt: Date): Promise<boolean>;
  findByImportKey(householdId: string, importKey: string): Promise<ReceiptIntakeBundle | null>;
  insertBundle(data: ReceiptIntakeInsert): Promise<ReceiptIntakeBundle>;
};

export type ReceiptIntakeResult =
  | { status: 200 | 201; body: ReceiptIntakeBundle }
  | {
      status: 400 | 401 | 404 | 409 | 422;
      body: { error: string; message: string; candidates?: string[] };
    };

function fail(
  status: 400 | 401 | 404 | 409 | 422,
  error: string,
  message: string,
  candidates?: string[],
): ReceiptIntakeResult {
  return {
    status,
    body: candidates ? { error, message, candidates } : { error, message },
  };
}

function readString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | null {
  const text = readString(value);
  return text ? text : null;
}

export async function ingestReceiptIntake(input: {
  authorization: string | null;
  payload: unknown;
  store: ReceiptIntakeStore;
  newId?: () => string;
}): Promise<ReceiptIntakeResult> {
  const token = bearerTokenFromAuthorization(input.authorization);
  if (!token) return fail(401, "unauthorized", "Missing bearer token.");
  const account = await input.store.accountForTokenHash(hashTreatmentIntakeToken(token));
  if (!account) return fail(401, "unauthorized", "Unknown intake token.");
  if (!account.familyMemberId) {
    return fail(
      422,
      "user_not_linked",
      "This user is not linked to a family member, so the token cannot tell the two clinics apart.",
    );
  }
  const householdId = account.householdId;
  const familyMemberId = account.familyMemberId;

  if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) {
    return fail(400, "invalid_json", "Request body must be a JSON object.");
  }
  const body = input.payload as Record<string, unknown>;
  const externalId = readString(body.external_id);
  if (!externalId || externalId.length > 200 || /[\s\u0000-\u001f]/.test(externalId)) {
    return fail(
      400,
      "invalid_external_id",
      "external_id is required and must be a single line of at most 200 characters.",
    );
  }
  const importKey = receiptIntakeImportKey(account.userId, externalId);
  const existing = await input.store.findByImportKey(householdId, importKey);
  if (existing) return { status: 200, body: existing };

  const receiptNumber = readString(body.receipt_number);
  if (!receiptNumber) return fail(400, "missing_receipt_number", "receipt_number is required.");
  const paymentDateRaw = readString(body.payment_date);
  const paymentDate = paymentDateRaw ? parseTherapyOccurredAtFromForm(paymentDateRaw, "") : null;
  if (!paymentDate) {
    return fail(400, "invalid_date", "payment_date is required as yyyy-mm-dd.");
  }
  const clientName = readString(body.client_name);
  if (!clientName) return fail(400, "missing_client_name", "client_name is required.");

  const parsedAmount = parseIntakeAmount(readString(body.amount));
  if (parsedAmount === "invalid" || !parsedAmount) {
    return fail(400, "invalid_amount", "amount is required and must be a number zero or greater.");
  }

  const payment = parseReceiptIntakePaymentMethod(readString(body.payment_method));
  if (!payment) {
    return fail(
      400,
      "invalid_payment_method",
      "payment_method must be Bank transfer, Cash, Bit, or Paybox.",
    );
  }

  const treatmentTime = readString(body.treatment_time);
  const treatmentDates: Date[] = [];
  for (const field of DATE_FIELDS) {
    const raw = readString(body[field]);
    if (!raw) continue;
    const occurredAt = parseTherapyOccurredAtFromForm(raw, treatmentTime);
    if (!occurredAt) {
      return fail(
        400,
        "invalid_date",
        `${field} must be yyyy-mm-dd. treatment_time, when set, must be HH:mm in Israel time.`,
      );
    }
    treatmentDates.push(occurredAt);
  }
  if (treatmentDates.length === 0) {
    return fail(400, "missing_treatment_date", "At least one treatment date is required.");
  }

  const clients = await input.store.activeClients(householdId, familyMemberId);
  const matched = matchIntakeClients(clientName, clients);
  if (!matched.ok) {
    if (matched.error === "ambiguous_client") {
      return fail(
        409,
        "ambiguous_client",
        `More than one client matches. Send one of: ${matched.candidates.join(", ")}`,
        matched.candidates,
      );
    }
    return fail(404, "client_not_found", "No active client matches that name.");
  }
  const client = matched.client;
  const job = await input.store.job(householdId, client.default_job_id, familyMemberId);
  if (!job) {
    return fail(422, "job_not_in_clinic", "The client's default job is not in this user's clinic.");
  }

  let programId = client.default_program_id;
  if (programId) {
    const belongs = await input.store.programBelongsToJob(householdId, programId, job.id);
    if (!belongs) programId = null;
  }
  const programCount = await input.store.programCount(householdId, job.id);
  if (programCount > 0 && !programId) {
    return fail(
      422,
      "program_required",
      "This job has programs and the client has no default program. Set a default program on the client, then submit again.",
    );
  }
  const visitType = client.default_visit_type;
  if (!visitType) {
    return fail(
      422,
      "visit_type_required",
      "The client has no default visit type.",
    );
  }

  let digitalMethodId: string | null = null;
  let receiptPayment: TherapyReceiptPaymentMethod;
  let treatmentPayment: TherapyTreatmentPaymentMethod;
  if (payment.kind === "cash") {
    receiptPayment = "cash";
    treatmentPayment = "cash";
  } else if (payment.kind === "bank_transfer") {
    receiptPayment = "bank_transfer";
    treatmentPayment = "bank_transfer";
  } else {
    digitalMethodId = await input.store.findDigitalPaymentMethod(
      householdId,
      familyMemberId,
      payment.name,
    );
    if (!digitalMethodId) {
      return fail(
        422,
        "digital_method_not_found",
        `No active digital payment method named ${payment.name} was found for this household.`,
      );
    }
    receiptPayment = "digital_card";
    treatmentPayment = "digital_payment";
  }

  const numberOk = await input.store.receiptNumberAvailable(householdId, receiptNumber, paymentDate);
  if (!numberOk) {
    return fail(
      409,
      "duplicate_receipt_number",
      "That receipt number is already used for this household in the same calendar year.",
    );
  }

  const shares = splitReceiptAmount(parsedAmount, treatmentDates.length);
  const nextId = input.newId ?? (() => crypto.randomUUID());
  const receiptId = nextId();
  const treatments = treatmentDates.map((occurredAt, index) => ({
    id: nextId(),
    household_id: householdId,
    client_id: client.id,
    family_id: client.family_id,
    job_id: job.id,
    program_id: programId,
    occurred_at: occurredAt,
    amount: shares[index] ?? parsedAmount,
    currency: "ILS",
    visit_type: visitType,
    payment_date: paymentDate,
    payment_method: treatmentPayment,
    payment_digital_payment_method_id: digitalMethodId,
    reported_to_external_system: Boolean(job.external_reporting_system),
    import_key: `${importKey}:${index + 1}`,
  }));
  const bundle: ReceiptIntakeInsert = {
    receipt: {
      id: receiptId,
      household_id: householdId,
      job_id: job.id,
      client_id: client.id,
      family_id: client.family_id,
      program_id: programId,
      receipt_number: receiptNumber,
      issued_at: paymentDate,
      payment_date: paymentDate,
      total_amount: parsedAmount,
      net_amount: parsedAmount,
      currency: "ILS",
      recipient_type: "client",
      receipt_kind: "regular",
      payment_method: receiptPayment,
      notes: readOptionalString(body.notes),
      import_key: importKey,
      receipt_number_source: "manual",
    },
    treatments,
    allocations: treatments.map((treatment) => ({
      id: nextId(),
      household_id: householdId,
      receipt_id: receiptId,
      treatment_id: treatment.id,
      amount: treatment.amount,
    })),
  };

  try {
    const created = await input.store.insertBundle(bundle);
    return { status: 201, body: created };
  } catch (error) {
    if (error instanceof IntakeImportKeyConflict) {
      const again = await input.store.findByImportKey(householdId, importKey);
      if (again) return { status: 200, body: again };
    }
    throw error;
  }
}
