import { createHash } from "node:crypto";
import type { TherapyVisitType } from "@/generated/prisma/enums";
import { matchIntakeClients } from "@/lib/therapy/intake-client-match";
import { parseTherapyOccurredAtFromForm } from "@/lib/therapy/occurred-at-form";
import {
  resolveTreatmentFeePrefill,
  type VisitTypeDefaultRow,
} from "@/lib/therapy/visit-type-defaults";

export const TREATMENT_INTAKE_PATH = "/api/private-clinic/intake/treatments";

export function hashTreatmentIntakeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function treatmentIntakeWebhookUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}${TREATMENT_INTAKE_PATH}`;
}

export function bearerTokenFromAuthorization(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match?.[1] ?? null;
}

const VISIT_ALIASES: Record<string, TherapyVisitType> = {
  clinic: "clinic",
  home: "home",
  phone: "phone",
  video: "video",
  zoom: "video",
  מרפאה: "clinic",
  בית: "home",
  טלפון: "phone",
  וידאו: "video",
  זום: "video",
};

export function parseIntakeVisitType(raw: string): TherapyVisitType | null {
  const key = raw.trim().toLocaleLowerCase("en-US");
  return VISIT_ALIASES[key] ?? null;
}

/** Empty input is missing. A non-numeric value is invalid. */
export function parseIntakeAmount(raw: string | null | undefined): string | null | "invalid" {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return "invalid";
  return parsed.toFixed(2);
}

export class IntakeImportKeyConflict extends Error {
  constructor() {
    super("INTAKE_IMPORT_KEY_CONFLICT");
    this.name = "IntakeImportKeyConflict";
  }
}

export type IntakeClientRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  family_id: string | null;
  default_job_id: string;
  default_program_id: string | null;
  default_visit_type: TherapyVisitType | null;
  agreed_fee_amount: { toString(): string } | string | number | null;
  agreed_fee_currency: string | null;
};

export type IntakeTreatmentInsert = {
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
  note_1: string | null;
  note_2: string | null;
  note_3: string | null;
  reported_to_external_system: boolean;
  import_key: string;
};

export type IntakeStore = {
  accountForTokenHash(hash: string): Promise<IntakeAccount | null>;
  activeClients(householdId: string, familyMemberId: string): Promise<IntakeClientRow[]>;
  job(
    householdId: string,
    jobId: string,
    familyMemberId: string,
  ): Promise<{ id: string; external_reporting_system: string | null } | null>;
  programCount(householdId: string, jobId: string): Promise<number>;
  programBelongsToJob(householdId: string, programId: string, jobId: string): Promise<boolean>;
  visitDefaults(householdId: string, jobId: string): Promise<VisitTypeDefaultRow[]>;
  findByImportKey(householdId: string, importKey: string): Promise<{ id: string } | null>;
  insertTreatment(data: IntakeTreatmentInsert): Promise<{ id: string }>;
};

export type IntakeResult =
  | { status: 200 | 201; body: { id: string } }
  | {
      status: 400 | 401 | 404 | 409 | 422;
      body: { error: string; message: string; candidates?: string[] };
    };

function fail(
  status: 400 | 401 | 404 | 409 | 422,
  error: string,
  message: string,
  candidates?: string[],
): IntakeResult {
  return {
    status,
    body: candidates ? { error, message, candidates } : { error, message },
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readReported(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLocaleLowerCase("en-US");
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function noteOrNull(value: unknown): string | null {
  const text = readOptionalString(value);
  return text;
}

export function intakeImportKey(userId: string, externalId: string): string {
  return `gform:${userId}:${externalId}`;
}

export type IntakeAccount = {
  householdId: string;
  userId: string;
  familyMemberId: string | null;
};

export async function ingestTreatmentIntake(input: {
  authorization: string | null;
  payload: unknown;
  store: IntakeStore;
  newId?: () => string;
}): Promise<IntakeResult> {
  const token = bearerTokenFromAuthorization(input.authorization);
  if (!token) {
    return fail(401, "unauthorized", "Missing bearer token.");
  }
  const account = await input.store.accountForTokenHash(hashTreatmentIntakeToken(token));
  if (!account) {
    return fail(401, "unauthorized", "Unknown intake token.");
  }
  if (!account.familyMemberId) {
    return fail(
      422,
      "user_not_linked",
      "This user is not linked to a family member, so the token cannot tell the two clinics apart.",
    );
  }
  const householdId = account.householdId;

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
  const importKey = intakeImportKey(account.userId, externalId);
  const existing = await input.store.findByImportKey(householdId, importKey);
  if (existing) return { status: 200, body: { id: existing.id } };

  const clientName = readString(body.client_name);
  if (!clientName) {
    return fail(400, "missing_client_name", "client_name is required.");
  }
  const occurredDate = readString(body.occurred_date);
  if (!occurredDate) {
    return fail(400, "missing_date", "occurred_date is required as yyyy-mm-dd.");
  }
  const occurredTime = readString(body.occurred_time);
  const occurredAt = parseTherapyOccurredAtFromForm(occurredDate, occurredTime);
  if (!occurredAt) {
    return fail(
      400,
      "invalid_date",
      "occurred_date must be yyyy-mm-dd. occurred_time, when set, must be HH:mm in Israel time.",
    );
  }

  const visitRaw = readString(body.visit_type);
  let visitFromBody: TherapyVisitType | null = null;
  if (visitRaw) {
    visitFromBody = parseIntakeVisitType(visitRaw);
    if (!visitFromBody) {
      return fail(
        400,
        "invalid_visit_type",
        "visit_type must be clinic, home, phone, or video (Hebrew labels are accepted).",
      );
    }
  }

  const amountRaw = typeof body.amount === "number" ? String(body.amount) : readOptionalString(body.amount);
  const parsedAmount = parseIntakeAmount(amountRaw);
  if (parsedAmount === "invalid") {
    return fail(400, "invalid_amount", "amount must be a number zero or greater.");
  }

  const currencyRaw = readOptionalString(body.currency);
  let explicitCurrency: string | null = null;
  if (currencyRaw) {
    if (!/^[A-Za-z]{3}$/.test(currencyRaw)) {
      return fail(400, "invalid_currency", "currency must be a 3-letter code such as ILS.");
    }
    explicitCurrency = currencyRaw.toUpperCase();
  }

  const clients = await input.store.activeClients(householdId, account.familyMemberId);
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

  const job = await input.store.job(householdId, client.default_job_id, account.familyMemberId);
  if (!job) {
    return fail(
      422,
      "job_not_in_clinic",
      "The client's default job is not in this user's clinic.",
    );
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

  const visitType = visitFromBody ?? client.default_visit_type;
  if (!visitType) {
    return fail(
      422,
      "visit_type_required",
      "visit_type is required when the client has no default visit type.",
    );
  }

  let amount = parsedAmount;
  let currency = explicitCurrency ?? "ILS";
  if (!amount) {
    const defaults = await input.store.visitDefaults(householdId, job.id);
    const prefill = resolveTreatmentFeePrefill({
      agreedFeeAmount: client.agreed_fee_amount,
      agreedFeeCurrency: client.agreed_fee_currency,
      visitDefaults: defaults,
      jobId: job.id,
      programId,
      visitType,
    });
    const fallback = parseIntakeAmount(prefill.amount);
    if (fallback === "invalid" || !fallback) {
      return fail(
        422,
        "amount_required",
        "amount is required when the client has no agreed fee and no visit-type default.",
      );
    }
    amount = fallback;
    if (!explicitCurrency) currency = (prefill.currency || "ILS").slice(0, 12) || "ILS";
  }

  const treatmentId = input.newId?.() ?? crypto.randomUUID();
  try {
    const created = await input.store.insertTreatment({
      id: treatmentId,
      household_id: householdId,
      client_id: client.id,
      family_id: client.family_id,
      job_id: job.id,
      program_id: programId,
      occurred_at: occurredAt,
      amount,
      currency,
      visit_type: visitType,
      note_1: noteOrNull(body.note_1),
      note_2: noteOrNull(body.note_2),
      note_3: noteOrNull(body.note_3),
      reported_to_external_system:
        readReported(body.reported_to_external_system) && Boolean(job.external_reporting_system),
      import_key: importKey,
    });
    return { status: 201, body: { id: created.id } };
  } catch (error) {
    if (error instanceof IntakeImportKeyConflict) {
      const again = await input.store.findByImportKey(householdId, importKey);
      if (again) return { status: 200, body: { id: again.id } };
    }
    throw error;
  }
}
