import type { MorningReceiptNumberingMode } from "@/generated/prisma/client";

export type ReceiptNumberingChoice = "morning" | "manual";

export function parseReceiptNumberingChoice(raw: string | null | undefined): ReceiptNumberingChoice | null {
  const v = raw?.trim();
  if (v === "morning" || v === "manual") return v;
  return null;
}

export function parseMorningReceiptNumberingMode(
  raw: string | null | undefined,
): MorningReceiptNumberingMode {
  if (raw === "manual" || raw === "morning_auto" || raw === "ask_each_time") return raw;
  return "ask_each_time";
}

export function resolveIssueViaMorningOnCreate(args: {
  morningIntegrationEnabled: boolean;
  numberingMode: MorningReceiptNumberingMode;
  formChoice: ReceiptNumberingChoice | null;
}): boolean {
  if (!args.morningIntegrationEnabled) return false;
  if (args.numberingMode === "manual") return false;
  if (args.numberingMode === "morning_auto") {
    return args.formChoice !== "manual";
  }
  return args.formChoice === "morning";
}

export function showReceiptNumberingChoiceOnCreate(
  morningIntegrationEnabled: boolean,
  numberingMode: MorningReceiptNumberingMode,
): boolean {
  if (!morningIntegrationEnabled) return false;
  return numberingMode === "ask_each_time" || numberingMode === "morning_auto";
}

export function defaultReceiptNumberingChoiceOnCreate(
  numberingMode: MorningReceiptNumberingMode,
): ReceiptNumberingChoice {
  if (numberingMode === "morning_auto") return "morning";
  return "morning";
}
