import type { TherapyReceiptPaymentMethod } from "@/generated/prisma/client";
import {
  createClient,
  createDocument,
  decimalToNumber,
  formatClientDisplayName,
  formatDateYmd,
  getDocumentDownloadLinks,
  downloadDocumentPdf,
  mapPaymentMethodToMorningType,
  searchClients,
  type MorningCredentials,
  type MorningCreateDocumentRequest,
  type MorningIncomeRow,
} from "./client";

export type TherapyClientForMorning = {
  id: string;
  first_name: string;
  last_name: string | null;
  id_number: string | null;
  email: string | null;
  phones: string | null;
  address: string | null;
  morning_client_id: string | null;
};

export type ReceiptIncomeLine = {
  description: string;
  amount: number;
};

export type ReceiptForMorning = {
  id: string;
  issued_at: Date;
  payment_date: Date | null;
  total_amount: { toString(): string };
  net_amount: { toString(): string };
  currency: string;
  payment_method: TherapyReceiptPaymentMethod;
  notes: string | null;
  covered_period_start: Date | null;
  covered_period_end: Date | null;
};

export async function ensureMorningClient(
  creds: MorningCredentials,
  client: TherapyClientForMorning,
): Promise<string> {
  if (client.morning_client_id) {
    return client.morning_client_id;
  }

  const name = formatClientDisplayName(client.first_name, client.last_name);
  if (client.id_number) {
    const byTax = await searchClients(creds, { taxId: client.id_number, pageSize: 5 });
    const match = byTax.items?.find((c) => c.taxId === client.id_number);
    if (match?.id) return match.id;
  }

  const byName = await searchClients(creds, { name, pageSize: 5 });
  const exactName = byName.items?.find((c) => c.name?.trim() === name);
  if (exactName?.id) return exactName.id;

  const created = await createClient(creds, {
    name,
    taxId: client.id_number ?? undefined,
    emails: client.email ? [client.email] : undefined,
    phone: client.phones ?? undefined,
    address: client.address ?? undefined,
  });
  if (!created.id) {
    throw new Error("Morning client creation did not return an id");
  }
  return created.id;
}

function buildRemarks(receipt: ReceiptForMorning): string | undefined {
  const parts: string[] = [];
  if (receipt.covered_period_start && receipt.covered_period_end) {
    parts.push(
      `תקופה: ${formatDateYmd(receipt.covered_period_start)} – ${formatDateYmd(receipt.covered_period_end)}`,
    );
  }
  if (receipt.notes?.trim()) {
    parts.push(receipt.notes.trim());
  }
  return parts.length ? parts.join("\n") : undefined;
}

export function buildIncomeRows(
  lines: ReceiptIncomeLine[],
  currency: string,
  vatExempt: boolean,
): MorningIncomeRow[] {
  if (lines.length === 0) {
    return [
      {
        description: "שירותים",
        quantity: 1,
        price: 0,
        currency,
        currencyRate: 1,
        vatType: vatExempt ? 1 : 0,
        vatRate: vatExempt ? 0 : 0.18,
      },
    ];
  }
  return lines.map((line) => ({
    description: line.description,
    quantity: 1,
    price: line.amount,
    currency,
    currencyRate: 1,
    vatType: vatExempt ? 1 : 0,
    vatRate: vatExempt ? 0 : 0.18,
  }));
}

export function buildDocumentPayload(
  receipt: ReceiptForMorning,
  morningClientId: string,
  clientName: string,
  clientTaxId: string | null | undefined,
  incomeLines: ReceiptIncomeLine[],
  documentType: number,
  vatExempt: boolean,
): MorningCreateDocumentRequest {
  const gross = decimalToNumber(receipt.total_amount);
  const net = decimalToNumber(receipt.net_amount);
  const incomeAmount = vatExempt ? net : gross;
  const paymentDate = receipt.payment_date ?? receipt.issued_at;

  return {
    type: documentType,
    date: formatDateYmd(receipt.issued_at),
    lang: "he",
    currency: receipt.currency || "ILS",
    vatType: vatExempt ? 1 : 0,
    signed: true,
    description: "קבלה על שירותים",
    remarks: buildRemarks(receipt),
    client: {
      id: morningClientId,
      name: clientName,
      taxId: clientTaxId ?? undefined,
      add: false,
    },
    income: buildIncomeRows(
      incomeLines.length
        ? incomeLines
        : [{ description: "שירותים", amount: incomeAmount }],
      receipt.currency || "ILS",
      vatExempt,
    ),
    payment: [
      {
        date: formatDateYmd(paymentDate),
        type: mapPaymentMethodToMorningType(receipt.payment_method),
        price: gross,
        currency: receipt.currency || "ILS",
        currencyRate: 1,
      },
    ],
  };
}

export type IssueMorningReceiptResult = {
  documentId: string;
  receiptNumber: string;
  pdfBuffer: Buffer;
  morningClientId: string;
};

export async function issueMorningReceipt(
  creds: MorningCredentials,
  receipt: ReceiptForMorning,
  client: TherapyClientForMorning,
  incomeLines: ReceiptIncomeLine[],
  documentType: number,
  vatExempt: boolean,
): Promise<IssueMorningReceiptResult> {
  const morningClientId = await ensureMorningClient(creds, client);
  const clientName = formatClientDisplayName(client.first_name, client.last_name);
  const payload = buildDocumentPayload(
    receipt,
    morningClientId,
    clientName,
    client.id_number,
    incomeLines,
    documentType,
    vatExempt,
  );
  const doc = await createDocument(creds, payload);
  const links = await getDocumentDownloadLinks(creds, doc.id);
  const pdfUrl = links.he || links.origin || links.en;
  if (!pdfUrl) {
    throw new Error("Morning did not return a PDF download link");
  }
  const pdfBuffer = await downloadDocumentPdf(pdfUrl);
  return {
    documentId: doc.id,
    receiptNumber: String(doc.number),
    pdfBuffer,
    morningClientId,
  };
}

export { getBusinessMe } from "./client";
