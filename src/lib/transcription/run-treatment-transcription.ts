import { transcribeFromS3WithAwsBatch } from "./aws-transcribe-batch";
import { transcribeWithOpenAIWhisper } from "./openai-whisper";

export type TreatmentTranscriptionLanguage = "en" | "he";

/** Per-household setting (therapy_settings.hebrew_transcription_provider). */
export type HebrewTranscriptionBackend = "openrouter" | "aws";

export type TreatmentTranscriptionResult = {
  text: string;
  provider: "openai" | "openrouter" | "aws";
};

/**
 * Hebrew + household `aws` + TRANSCRIBE_DATA_ACCESS_ROLE_ARN → Amazon Transcribe batch (S3).
 * Otherwise OpenRouter/OpenAI Whisper path. AWS failure falls back to OpenRouter/OpenAI when configured.
 */
export async function runTreatmentTranscription(opts: {
  language: TreatmentTranscriptionLanguage;
  /** For OpenAI path */
  audio: Buffer;
  fileName: string;
  mimeType: string;
  /** For AWS path */
  s3Bucket: string;
  s3Key: string;
  householdId: string;
  attachmentId: string;
  /** When language is Hebrew, which backend the household selected (super-admin). */
  hebrewBackend: HebrewTranscriptionBackend;
}): Promise<TreatmentTranscriptionResult> {
  const roleArn = process.env.TRANSCRIBE_DATA_ACCESS_ROLE_ARN?.trim();
  const useAwsHebrew =
    opts.language === "he" && opts.hebrewBackend === "aws" && Boolean(roleArn);

  if (useAwsHebrew) {
    try {
      const text = await transcribeFromS3WithAwsBatch({
        bucket: opts.s3Bucket,
        key: opts.s3Key,
        mimeType: opts.mimeType,
        language: "he",
        jobNameBase: `pc-${opts.attachmentId}`,
        outputKeyPrefix: `${opts.householdId}/therapy-transcription-output`,
      });
      return { text, provider: "aws" };
    } catch (e) {
      console.error("AWS Transcribe (Hebrew) failed, falling back to OpenRouter/OpenAI if configured:", e);
    }
  }

  const result = await transcribeWithOpenAIWhisper(
    opts.audio,
    opts.fileName,
    opts.mimeType,
    opts.language,
  );
  return { text: result.text, provider: result.provider };
}
