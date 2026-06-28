import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import {
  buildRiseUpImportDraftState,
  parseRiseUpImportDraftState,
  summarizeRiseUpImportDraft,
  type RiseUpImportDraftProposalWorkExpense,
  type RiseUpImportDraftRowOverride,
  type RiseUpImportDraftState,
  type RiseUpImportDraftTxFilters,
} from "@/lib/riseup-import-draft";
import type { RiseUpImportAction } from "@/lib/riseup-commit-types";

async function requireHouseholdId(req: NextRequest): Promise<
  | { ok: true; householdId: string }
  | { ok: false; response: NextResponse }
> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.email) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const householdId = token.householdId as string | undefined;
  if (!householdId || token.isSuperAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Household users only. Sign in as a household member." },
        { status: 403 },
      ),
    };
  }
  return { ok: true, householdId };
}

export async function GET(req: NextRequest) {
  const auth = await requireHouseholdId(req);
  if (!auth.ok) return auth.response;

  const draft = await prisma.riseup_import_drafts.findUnique({
    where: { household_id: auth.householdId },
  });
  if (!draft) {
    return NextResponse.json({ draft: null });
  }

  const state = parseRiseUpImportDraftState(draft.draft_state_json);
  if (!state) {
    return NextResponse.json({ draft: null });
  }

  return NextResponse.json({
    draft: {
      ...summarizeRiseUpImportDraft(state, draft.updated_at),
      activeSection: state.activeSection ?? null,
      txFilters: state.txFilters ?? null,
    },
  });
}

type PutDraftBody = {
  fileName: string;
  fileContentHash: string;
  rows: Array<{ riseup_import_key: string; rowIndex: number }>;
  actions: Record<number, RiseUpImportAction>;
  overrides: Record<number, RiseUpImportDraftRowOverride>;
  proposalActions: Record<string, "approve" | "reject" | "skip">;
  proposalWorkExpense: Record<string, RiseUpImportDraftProposalWorkExpense>;
  activeSection?: string;
  txFilters?: RiseUpImportDraftTxFilters;
  proposals?: Array<{ id?: string; clientKey: string }>;
};

export async function PUT(req: NextRequest) {
  const auth = await requireHouseholdId(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as PutDraftBody;
  if (
    !body?.fileName ||
    !body?.fileContentHash ||
    !Array.isArray(body.rows) ||
    body.rows.length === 0
  ) {
    return NextResponse.json({ error: "Invalid draft payload" }, { status: 400 });
  }

  const draftState = buildRiseUpImportDraftState({
    fileName: body.fileName,
    fileContentHash: body.fileContentHash,
    rows: body.rows,
    actions: body.actions,
    overrides: body.overrides,
    proposalActions: body.proposalActions ?? {},
    proposalWorkExpense: body.proposalWorkExpense ?? {},
    activeSection: body.activeSection,
    txFilters: body.txFilters,
    proposals: body.proposals,
  });

  const saved = await prisma.riseup_import_drafts.upsert({
    where: { household_id: auth.householdId },
    create: {
      id: crypto.randomUUID(),
      household_id: auth.householdId,
      file_name: body.fileName,
      file_content_hash: body.fileContentHash,
      row_count: body.rows.length,
      draft_state_json: draftState as unknown as Prisma.InputJsonValue,
    },
    update: {
      file_name: body.fileName,
      file_content_hash: body.fileContentHash,
      row_count: body.rows.length,
      draft_state_json: draftState as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    ok: true,
    draft: summarizeRiseUpImportDraft(draftState, saved.updated_at),
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireHouseholdId(req);
  if (!auth.ok) return auth.response;

  await prisma.riseup_import_drafts.deleteMany({
    where: { household_id: auth.householdId },
  });

  return NextResponse.json({ ok: true });
}
