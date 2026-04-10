import {
  GetTranscriptionJobCommand,
  MediaFormat,
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { getJobDocumentStorageConfig } from "@/lib/object-storage";

/**
 * Batch Amazon Transcribe from S3 — strong fit for Hebrew (`he-IL`) when IAM allows Transcribe to read/write S3.
 * Requires real AWS S3 (not generic S3-compatible endpoints) for MediaFileUri.
 * Set TRANSCRIBE_DATA_ACCESS_ROLE_ARN to an IAM role trusted by transcribe.amazonaws.com with S3 read on input and write on output prefix.
 */
function transcribeClient(region: string, accessKeyId: string, secretAccessKey: string): TranscribeClient {
  return new TranscribeClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function s3Client(): S3Client {
  const cfg = getJobDocumentStorageConfig();
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

function mediaFormatFromMime(mimeType: string): (typeof MediaFormat)[keyof typeof MediaFormat] {
  const m = mimeType.toLowerCase();
  if (m.includes("mpeg") || m === "audio/mp3") return MediaFormat.MP3;
  if (m.includes("mp4")) return MediaFormat.MP4;
  if (m.includes("m4a")) return MediaFormat.M4A;
  if (m.includes("wav")) return MediaFormat.WAV;
  if (m.includes("flac")) return MediaFormat.FLAC;
  if (m.includes("webm")) return MediaFormat.WEBM;
  if (m.includes("ogg")) return MediaFormat.OGG;
  return MediaFormat.MP3;
}

function awsLanguageCode(lang: "en" | "he"): "en-US" | "he-IL" {
  return lang === "he" ? "he-IL" : "en-US";
}

export async function transcribeFromS3WithAwsBatch(opts: {
  bucket: string;
  key: string;
  mimeType: string;
  language: "en" | "he";
  /** Unique per job; keep short (AWS limits job name length). */
  jobNameBase: string;
  outputKeyPrefix: string;
}): Promise<string> {
  const roleArn = process.env.TRANSCRIBE_DATA_ACCESS_ROLE_ARN?.trim();
  if (!roleArn) {
    throw new Error("TRANSCRIBE_DATA_ACCESS_ROLE_ARN is not configured");
  }

  const cfg = getJobDocumentStorageConfig();
  const mediaUri = `s3://${opts.bucket}/${opts.key}`;
  const safeBase = opts.jobNameBase.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
  const jobName = `${safeBase}-${Date.now()}`.slice(0, 200);

  const outputKey = `${opts.outputKeyPrefix.replace(/\/$/, "")}/${jobName}.json`;

  const transcribe = transcribeClient(cfg.region, cfg.accessKeyId, cfg.secretAccessKey);
  await transcribe.send(
    new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: awsLanguageCode(opts.language),
      MediaFormat: mediaFormatFromMime(opts.mimeType),
      Media: { MediaFileUri: mediaUri },
      OutputBucketName: cfg.bucket,
      OutputKey: outputKey,
      JobExecutionSettings: {
        AllowDeferredExecution: false,
        DataAccessRoleArn: roleArn,
      },
    }),
  );

  const maxAttempts = 150;
  const delayMs = 2000;
  await new Promise((r) => setTimeout(r, delayMs));

  for (let i = 0; i < maxAttempts; i++) {
    const job = await transcribe.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }));
    const status = job.TranscriptionJob?.TranscriptionJobStatus;
    if (status === "COMPLETED") {
      const s3 = s3Client();
      const obj = await s3.send(
        new GetObjectCommand({
          Bucket: cfg.bucket,
          Key: outputKey,
        }),
      );
      const body = obj.Body;
      if (!body) throw new Error("Empty transcript object");
      const chunks: Buffer[] = [];
      const iterable = body as AsyncIterable<Uint8Array | Buffer>;
      for await (const chunk of iterable) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const json = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        results?: { transcripts?: Array<{ transcript?: string }> };
      };
      const text = json.results?.transcripts?.[0]?.transcript?.trim();
      if (!text) throw new Error("Transcript JSON had no text");
      return text;
    }
    if (status === "FAILED") {
      const reason = job.TranscriptionJob?.FailureReason || "Transcription job failed";
      throw new Error(reason);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new Error("Transcription job timed out");
}
