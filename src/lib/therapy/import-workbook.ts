import { prisma } from "@/lib/auth";
import * as XLSX from "xlsx";

type Row = Record<string, string | number | boolean | undefined>;

function sheetRows(workbook: XLSX.WorkBook, name: string): Row[] {
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  const data = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
  return data.filter((r) => Object.keys(r).some((k) => String(r[k] ?? "").trim() !== ""));
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export async function importTherapyWorkbook(params: {
  householdId: string;
  workbook: XLSX.WorkBook;
}): Promise<{ imported: number; errors: string[] }> {
  const { householdId, workbook } = params;
  const errors: string[] = [];
  let imported = 0;

  const assertJob = async (jobId: string) => {
    const j = await prisma.jobs.findFirst({
      where: { id: jobId, household_id: householdId },
      select: { id: true },
    });
    return j?.id ?? null;
  };

  const assertConsultationType = async (typeId: string) => {
    const t = await prisma.therapy_consultation_types.findFirst({
      where: { id: typeId, household_id: householdId },
      select: { id: true },
    });
    return t?.id ?? null;
  };

  const assertTreatment = async (treatmentId: string) => {
    const t = await prisma.therapy_treatments.findFirst({
      where: { id: treatmentId, household_id: householdId },
      select: { id: true },
    });
    return t?.id ?? null;
  };

  // Programs
  for (const r of sheetRows(workbook, "Programs")) {
    const id = str(r.id);
    const job_id = str(r.job_id);
    const name = str(r.name);
    if (!job_id || !name) {
      errors.push(`Programs: skip row missing job_id or name`);
      continue;
    }
    if (!(await assertJob(job_id))) {
      errors.push(`Programs: job not found ${job_id}`);
      continue;
    }
    try {
      if (id) {
        await prisma.therapy_service_programs.upsert({
          where: { id },
          create: {
            id,
            household_id: householdId,
            job_id,
            name,
            description: str(r.description) || null,
            sort_order: Number(r.sort_order) || 0,
            is_active: r.is_active !== false && str(r.is_active) !== "false",
            visits_per_period_count: str(r.visits_per_period_count)
              ? Math.trunc(Number(str(r.visits_per_period_count)))
              : null,
            visits_per_period_weeks: str(r.visits_per_period_weeks)
              ? Math.trunc(Number(str(r.visits_per_period_weeks)))
              : null,
          },
          update: {
            job_id,
            name,
            description: str(r.description) || null,
            sort_order: Number(r.sort_order) || 0,
            is_active: r.is_active !== false && str(r.is_active) !== "false",
            visits_per_period_count: str(r.visits_per_period_count)
              ? Math.trunc(Number(str(r.visits_per_period_count)))
              : null,
            visits_per_period_weeks: str(r.visits_per_period_weeks)
              ? Math.trunc(Number(str(r.visits_per_period_weeks)))
              : null,
          },
        });
      } else {
        await prisma.therapy_service_programs.create({
          data: {
            id: crypto.randomUUID(),
            household_id: householdId,
            job_id,
            name,
            description: str(r.description) || null,
            sort_order: Number(r.sort_order) || 0,
            is_active: true,
            visits_per_period_count: str(r.visits_per_period_count)
              ? Math.trunc(Number(str(r.visits_per_period_count)))
              : null,
            visits_per_period_weeks: str(r.visits_per_period_weeks)
              ? Math.trunc(Number(str(r.visits_per_period_weeks)))
              : null,
          },
        });
      }
      imported += 1;
    } catch (e) {
      errors.push(`Programs: ${String(e)}`);
    }
  }

  // Clients
  for (const r of sheetRows(workbook, "Clients")) {
    const id = str(r.id);
    const default_job_id = str(r.default_job_id);
    const default_program_id = str(r.default_program_id);
    const first_name = str(r.first_name);
    if (!default_job_id || !default_program_id || !first_name) {
      errors.push(`Clients: skip row missing fields`);
      continue;
    }
    if (!(await assertJob(default_job_id))) {
      errors.push(`Clients: job ${default_job_id}`);
      continue;
    }
    const prog = await prisma.therapy_service_programs.findFirst({
      where: { id: default_program_id, household_id: householdId, job_id: default_job_id },
    });
    if (!prog) {
      errors.push(`Clients: program ${default_program_id} for job`);
      continue;
    }
    try {
      const billingBasisRaw = str(r.billing_basis);
      const billing_basis: "per_treatment" | "per_month" | null =
        billingBasisRaw === "per_month"
          ? "per_month"
          : billingBasisRaw === "per_treatment"
            ? "per_treatment"
            : null;
      const billingTimingRaw = str(r.billing_timing);
      const billing_timing: "in_advance" | "in_arrears" | null =
        billingTimingRaw === "in_advance"
          ? "in_advance"
          : billingTimingRaw === "in_arrears"
            ? "in_arrears"
            : null;
      const data = {
        first_name,
        last_name: str(r.last_name) || null,
        id_number: str(r.id_number) || null,
        start_date: str(r.start_date) ? new Date(str(r.start_date)) : null,
        end_date: str(r.end_date) ? new Date(str(r.end_date)) : null,
        notes: str(r.notes) || null,
        default_job_id,
        default_program_id,
        email: str(r.email) || null,
        phones: str(r.phones) || null,
        address: str(r.address) || null,
        visits_per_period_count: str(r.visits_per_period_count)
          ? Math.trunc(Number(str(r.visits_per_period_count)))
          : null,
        visits_per_period_weeks: str(r.visits_per_period_weeks)
          ? Math.trunc(Number(str(r.visits_per_period_weeks)))
          : null,
        disability_status: str(r.disability_status) || null,
        rehab_basket_status: str(r.rehab_basket_status) || null,
        family_id: str(r.family_id) || null,
        billing_basis,
        billing_timing,
        default_visit_type: parseVisit(str(r.default_visit_type))
          ? (str(r.default_visit_type) as "clinic" | "home" | "phone" | "video")
          : null,
        import_key: str(r.import_key) || null,
        is_active: str(r.is_active) !== "false",
      };
      if (id) {
        await prisma.therapy_clients.upsert({
          where: { id },
          create: { id, household_id: householdId, ...data },
          update: data,
        });
      } else {
        const cid = crypto.randomUUID();
        await prisma.therapy_clients.create({
          data: { id: cid, household_id: householdId, ...data },
        });
        await prisma.therapy_clients_jobs.create({
          data: {
            id: crypto.randomUUID(),
            household_id: householdId,
            client_id: cid,
            job_id: default_job_id,
            is_primary: true,
          },
        });
      }
      imported += 1;
    } catch (e) {
      errors.push(`Clients: ${String(e)}`);
    }
  }

  // ClientJobs (optional extra links)
  for (const r of sheetRows(workbook, "ClientJobs")) {
    const client_id = str(r.client_id);
    const job_id = str(r.job_id);
    if (!client_id || !job_id) continue;
    const c = await prisma.therapy_clients.findFirst({
      where: { id: client_id, household_id: householdId },
    });
    if (!c || !(await assertJob(job_id))) continue;
    try {
      await prisma.therapy_clients_jobs.upsert({
        where: {
          client_id_job_id: { client_id, job_id },
        },
        create: {
          id: str(r.id) || crypto.randomUUID(),
          household_id: householdId,
          client_id,
          job_id,
          is_primary: str(r.is_primary) === "true",
        },
        update: {
          is_primary: str(r.is_primary) === "true",
        },
      });
      imported += 1;
    } catch (e) {
      errors.push(`ClientJobs: ${String(e)}`);
    }
  }

  // Treatments
  for (const r of sheetRows(workbook, "Treatments")) {
    const client_id = str(r.client_id);
    const job_id = str(r.job_id);
    const program_id = str(r.program_id);
    const occurred_at = str(r.occurred_at);
    const amount = str(r.amount);
    const visit_type = str(r.visit_type);
    if (!client_id || !job_id || !program_id || !occurred_at || !amount || !visit_type) {
      errors.push(`Treatments: skip incomplete row`);
      continue;
    }
    if (!(parseVisit(visit_type))) {
      errors.push(`Treatments: bad visit_type ${visit_type}`);
      continue;
    }
    try {
      const pmRaw = str(r.payment_method);
      const payment_method =
        pmRaw === "bank_transfer" || pmRaw === "digital_payment"
          ? (pmRaw as "bank_transfer" | "digital_payment")
          : null;
      let payment_date: Date | null = null;
      if (str(r.payment_date)) {
        const pd = new Date(str(r.payment_date));
        payment_date = Number.isNaN(pd.getTime()) ? null : pd;
      }
      let payment_bank_account_id: string | null = null;
      let payment_digital_payment_method_id: string | null = null;
      if (payment_method === "bank_transfer") {
        const bid = str(r.payment_bank_account_id);
        if (bid) {
          const ba = await prisma.bank_accounts.findFirst({
            where: { id: bid, household_id: householdId },
            select: { id: true },
          });
          payment_bank_account_id = ba?.id ?? null;
        }
      } else if (payment_method === "digital_payment") {
        const did = str(r.payment_digital_payment_method_id);
        if (did) {
          const dm = await prisma.digital_payment_methods.findFirst({
            where: { id: did, household_id: householdId },
            select: { id: true },
          });
          payment_digital_payment_method_id = dm?.id ?? null;
        }
      }

      const data = {
        household_id: householdId,
        client_id,
        job_id,
        program_id,
        occurred_at: new Date(occurred_at),
        amount,
        currency: str(r.currency) || "ILS",
        visit_type: visit_type as "clinic" | "home" | "phone" | "video",
        note_1: str(r.note_1) || null,
        note_2: str(r.note_2) || null,
        note_3: str(r.note_3) || null,
        import_key: str(r.import_key) || null,
        linked_transaction_id: str(r.linked_transaction_id) || null,
        payment_date,
        payment_method,
        payment_bank_account_id,
        payment_digital_payment_method_id,
      };
      const id = str(r.id);
      if (id) {
        await prisma.therapy_treatments.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        });
      } else {
        await prisma.therapy_treatments.create({
          data: { id: crypto.randomUUID(), ...data },
        });
      }
      imported += 1;
    } catch (e) {
      errors.push(`Treatments: ${String(e)}`);
    }
  }

  // Receipts
  for (const r of sheetRows(workbook, "Receipts")) {
    const job_id = str(r.job_id);
    const receipt_number = str(r.receipt_number);
    const issued_at = str(r.issued_at);
    const total_amount = str(r.total_amount);
    const recipient_type = str(r.recipient_type);
    const payment_method = str(r.payment_method);
    if (!job_id || !receipt_number || !issued_at || !total_amount || !recipient_type || !payment_method) {
      errors.push(`Receipts: skip incomplete`);
      continue;
    }
    if (!(await assertJob(job_id))) continue;
    try {
      const data = {
        household_id: householdId,
        job_id,
        client_id: str(r.client_id) || null,
        family_id: str(r.family_id) || null,
        program_id: str(r.program_id) || null,
        receipt_number,
        issued_at: new Date(issued_at),
        total_amount,
        net_amount: str(r.net_amount) || total_amount,
        receipt_kind: (str(r.receipt_kind) || "regular") as "regular" | "salary_fictitious",
        currency: str(r.currency) || "ILS",
        recipient_type: recipient_type as "organization" | "client",
        payment_method: payment_method as "cash" | "bank_transfer" | "digital_card" | "credit_card",
        covered_period_start: str(r.covered_period_start) ? new Date(str(r.covered_period_start)) : null,
        covered_period_end: str(r.covered_period_end) ? new Date(str(r.covered_period_end)) : null,
        notes: str(r.notes) || null,
        import_key: str(r.import_key) || null,
        linked_transaction_id: str(r.linked_transaction_id) || null,
      };
      const id = str(r.id);
      if (id) {
        await prisma.therapy_receipts.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        });
      } else {
        await prisma.therapy_receipts.create({
          data: { id: crypto.randomUUID(), ...data },
        });
      }
      imported += 1;
    } catch (e) {
      errors.push(`Receipts: ${String(e)}`);
    }
  }

  // Allocations
  for (const r of sheetRows(workbook, "ReceiptAllocations")) {
    const receipt_id = str(r.receipt_id);
    const treatment_id = str(r.treatment_id);
    const amount = str(r.amount);
    if (!receipt_id || !treatment_id || !amount) continue;
    try {
      await prisma.therapy_receipt_allocations.upsert({
        where: {
          receipt_id_treatment_id: { receipt_id, treatment_id },
        },
        create: {
          id: str(r.id) || crypto.randomUUID(),
          household_id: householdId,
          receipt_id,
          treatment_id,
          amount,
        },
        update: { amount },
      });
      imported += 1;
    } catch (e) {
      errors.push(`ReceiptAllocations: ${String(e)}`);
    }
  }

  // Expenses
  for (const r of sheetRows(workbook, "Expenses")) {
    const job_id = str(r.job_id);
    const category_id = str(r.category_id);
    const expense_date = str(r.expense_date);
    const amount = str(r.amount);
    if (!job_id || !category_id || !expense_date || !amount) continue;
    if (!(await assertJob(job_id))) continue;
    try {
      const data = {
        household_id: householdId,
        job_id,
        category_id,
        expense_date: new Date(expense_date),
        amount,
        currency: str(r.currency) || "ILS",
        notes: str(r.notes) || null,
        image_file_name: str(r.image_file_name) || null,
        image_mime_type: str(r.image_mime_type) || null,
        image_storage_bucket: str(r.image_storage_bucket) || null,
        image_storage_key: str(r.image_storage_key) || null,
        image_storage_url: str(r.image_storage_url) || null,
        import_key: str(r.import_key) || null,
        linked_transaction_id: str(r.linked_transaction_id) || null,
      };
      const id = str(r.id);
      if (id) {
        await prisma.therapy_job_expenses.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        });
      } else {
        await prisma.therapy_job_expenses.create({
          data: { id: crypto.randomUUID(), ...data },
        });
      }
      imported += 1;
    } catch (e) {
      errors.push(`Expenses: ${String(e)}`);
    }
  }

  // Consultation types
  for (const r of sheetRows(workbook, "ConsultationTypes")) {
    const name = str(r.name);
    if (!name) continue;
    try {
      const id = str(r.id);
      if (id) {
        await prisma.therapy_consultation_types.upsert({
          where: { id },
          create: {
            id,
            household_id: householdId,
            name,
            name_he: str(r.name_he) || null,
            sort_order: Number(r.sort_order) || 0,
            is_system: str(r.is_system) === "true",
          },
          update: {
            name,
            name_he: str(r.name_he) || null,
            sort_order: Number(r.sort_order) || 0,
          },
        });
      } else {
        await prisma.therapy_consultation_types.create({
          data: {
            id: crypto.randomUUID(),
            household_id: householdId,
            name,
            name_he: str(r.name_he) || null,
            sort_order: Number(r.sort_order) || 0,
            is_system: false,
          },
        });
      }
      imported += 1;
    } catch (e) {
      errors.push(`ConsultationTypes: ${String(e)}`);
    }
  }

  // Consultations
  for (const r of sheetRows(workbook, "Consultations")) {
    const job_id = str(r.job_id);
    const consultation_type_id = str(r.consultation_type_id);
    const occurred_at = str(r.occurred_at);
    if (!job_id || !consultation_type_id || !occurred_at) continue;
    if (!(await assertJob(job_id))) continue;
    if (!(await assertConsultationType(consultation_type_id))) continue;
    const incomeStr = str(r.income_amount);
    const costStr = str(r.cost_amount);
    try {
      const data = {
        household_id: householdId,
        job_id,
        consultation_type_id,
        occurred_at: new Date(occurred_at),
        income_amount: incomeStr ? incomeStr : null,
        income_currency: str(r.income_currency) || "ILS",
        cost_amount: costStr ? costStr : null,
        cost_currency: str(r.cost_currency) || "ILS",
        notes: str(r.notes) || null,
        linked_income_transaction_id: str(r.linked_income_transaction_id) || null,
        linked_cost_transaction_id: str(r.linked_cost_transaction_id) || null,
      };
      const id = str(r.id);
      if (id) {
        await prisma.therapy_consultations.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        });
      } else {
        await prisma.therapy_consultations.create({
          data: { id: crypto.randomUUID(), ...data },
        });
      }
      imported += 1;
    } catch (e) {
      errors.push(`Consultations: ${String(e)}`);
    }
  }

  // Travel
  for (const r of sheetRows(workbook, "Travel")) {
    const job_id = str(r.job_id);
    const treatment_id = str(r.treatment_id);
    if (!job_id && !treatment_id) continue;
    if (job_id && treatment_id) {
      errors.push(`Travel: row has both job and treatment — skip`);
      continue;
    }
    if (job_id && !(await assertJob(job_id))) continue;
    if (treatment_id && !(await assertTreatment(treatment_id))) continue;
    try {
      const occurredRaw = str(r.occurred_at);
      const amountRaw = str(r.amount);
      const data = {
        household_id: householdId,
        job_id: job_id || null,
        treatment_id: treatment_id || null,
        occurred_at: occurredRaw ? new Date(occurredRaw) : null,
        amount: amountRaw || null,
        currency: str(r.currency) || "ILS",
        notes: str(r.notes) || null,
        linked_transaction_id: str(r.linked_transaction_id) || null,
      };
      const id = str(r.id);
      if (id) {
        await prisma.therapy_travel_entries.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        });
      } else {
        await prisma.therapy_travel_entries.create({
          data: { id: crypto.randomUUID(), ...data },
        });
      }
      imported += 1;
    } catch (e) {
      errors.push(`Travel: ${String(e)}`);
    }
  }

  return { imported, errors };
}

function parseVisit(v: string): boolean {
  return v === "clinic" || v === "home" || v === "phone" || v === "video";
}
