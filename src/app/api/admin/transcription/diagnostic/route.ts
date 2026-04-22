import { NextResponse } from "next/server";
import { getAuthSession, prisma } from "@/lib/auth";
import { getJobDocumentStorageConfig } from "@/lib/object-storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const householdId = url.searchParams.get("household_id")?.trim() || null;

  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const transcribeRoleConfigured = Boolean(process.env.TRANSCRIBE_DATA_ACCESS_ROLE_ARN?.trim());

  const storageCfg = getJobDocumentStorageConfig();
  const awsBatchEligibleStorage = !storageCfg.endpoint && !storageCfg.forcePathStyle;

  const householdSettings = householdId
    ? await prisma.therapy_settings.findUnique({
        where: { household_id: householdId },
        select: { hebrew_transcription_provider: true },
      })
    : null;

  const hebrewProviderSetting = householdSettings?.hebrew_transcription_provider ?? null;
  const awsHebrewEligible =
    hebrewProviderSetting === "aws" && transcribeRoleConfigured && awsBatchEligibleStorage;

  return NextResponse.json({
    ok: true,
    inputs: {
      householdId,
    },
    transcription: {
      providersConfigured: {
        openRouter: openRouterConfigured,
        openAi: openAiConfigured,
      },
      awsBatch: {
        roleConfigured: transcribeRoleConfigured,
        storageIsNativeAwsS3: awsBatchEligibleStorage,
        storageEndpoint: storageCfg.endpoint ?? "AWS default endpoint",
        storageRegion: storageCfg.region,
      },
      household: {
        hebrewProviderSetting,
        awsHebrewEligible,
      },
    },
    diagnosis: {
      likelyHebrewLargeFileIssue:
        "If OpenRouter is configured but OpenAI is missing, large audio can fail due to provider payload limits.",
      likelyFix:
        "Set OPENAI_API_KEY for fallback and/or set household Hebrew provider to AWS with TRANSCRIBE_DATA_ACCESS_ROLE_ARN.",
    },
    suggestedActions: [
      "For OpenRouter path resilience, configure OPENAI_API_KEY so large files can fall back.",
      "For AWS Hebrew, ensure therapy_settings.hebrew_transcription_provider = aws for the household.",
      "For AWS Hebrew, set TRANSCRIBE_DATA_ACCESS_ROLE_ARN and use native AWS S3 storage (no custom endpoint/path-style).",
      "Use ?household_id=<uuid> to diagnose one specific household setting.",
    ],
  });
}
