import { transcribeFromS3WithAwsBatch } from "./aws-transcribe-batch";
import { transcribeWithOpenAIWhisper } from "./openai-whisper";

export type TreatmentTranscriptionLanguage = "en" | "he";

export type TreatmentTranscriptionResult = {
  text: string;
  provider: "openai" | "openrouter" | "aws";
};

/**
 * Hebrew + TRANSCRIPTION_HEBREW_USE_AWS=true + TRANSCRIBE_DATA_ACCESS_ROLE_ARN → Amazon Transcribe batch (S3).
 * Otherwise OpenAI `whisper-1` (requires OPENAI_API_KEY). AWS failure falls back to OpenAI when key is set.
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
}): Promise<TreatmentTranscriptionResult> {
  const useAwsHebrew =
    opts.language === "he" &&
    process.env.TRANSCRIPTION_HEBREW_USE_AWS === "true" &&
    Boolean(process.env.TRANSCRIBE_DATA_ACCESS_ROLE_ARN?.trim());

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
      console.error("AWS Transcribe (Hebrew) failed, falling back to OpenAI if configured:", e);
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
