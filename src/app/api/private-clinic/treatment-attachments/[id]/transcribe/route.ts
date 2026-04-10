import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { getJobDocumentStorageConfig } from "@/lib/object-storage";
import { runTreatmentTranscription } from "@/lib/transcription/run-treatment-transcription";

const OPENAI_AUDIO_MAX_BYTES = 25 * 1024 * 1024;

function isAudioMime(mime: string): boolean {
  return mime.toLowerCase().startsWith("audio/");
}

function parseLanguage(raw: unknown): "en" | "he" | null {
  if (raw === "en" || raw === "he") return raw;
  return null;
}

async function readS3ObjectToBuffer(bucket: string, key: string): Promise<Buffer> {
  const cfg = getJobDocumentStorageConfig();
  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = result.Body;
  if (!body) throw new Error("Empty audio body");
  if (body instanceof Uint8Array) return Buffer.from(body);
  const arrayBufferFn = (body as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer;
  if (typeof arrayBufferFn === "function") {
    const ab = await arrayBufferFn.call(body as unknown);
    return Buffer.from(ab);
  }
  const chunks: Buffer[] = [];
  const iterable = body as unknown as AsyncIterable<Uint8Array | Buffer>;
  for await (const chunk of iterable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const householdId = token.householdId as string | undefined;
    if (!householdId || token.isSuperAdmin) {
      return NextResponse.json({ error: "Household users only." }, { status: 403 });
    }

    const { id } = await context.params;
    let bodyJson: { language?: string } = {};
    try {
      bodyJson = (await req.json()) as { language?: string };
    } catch {
      return NextResponse.json({ error: "JSON body required" }, { status: 400 });
    }

    const language = parseLanguage(bodyJson.language);
    if (!language) {
      return NextResponse.json({ error: 'language must be "en" or "he"' }, { status: 400 });
    }

    const att = await prisma.therapy_treatment_attachments.findFirst({
      where: { id, household_id: householdId },
    });

    if (!att) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    if (!isAudioMime(att.mime_type)) {
      return NextResponse.json({ error: "Not an audio attachment" }, { status: 400 });
    }
    if (att.transcription_status === "pending") {
      return NextResponse.json({ error: "Transcription already in progress" }, { status: 409 });
    }

    await prisma.therapy_treatment_attachments.update({
      where: { id: att.id },
      data: {
        transcription_status: "pending",
        transcription_error: null,
        transcription_language: language,
      },
    });

    try {
      const useAwsHebrew =
        language === "he" &&
        process.env.TRANSCRIPTION_HEBREW_USE_AWS === "true" &&
        Boolean(process.env.TRANSCRIBE_DATA_ACCESS_ROLE_ARN?.trim());

      let audio: Buffer;
      if (useAwsHebrew) {
        audio = Buffer.alloc(0);
      } else {
        audio = await readS3ObjectToBuffer(att.storage_bucket, att.storage_key);
        if (audio.length > OPENAI_AUDIO_MAX_BYTES) {
          await prisma.therapy_treatment_attachments.update({
            where: { id: att.id },
            data: {
              transcription_status: "failed",
              transcription_error: "Audio exceeds 25 MB (OpenAI limit).",
            },
          });
          return NextResponse.json({ error: "Audio exceeds 25 MB (OpenAI limit)." }, { status: 400 });
        }
      }

      const { text, provider } = await runTreatmentTranscription({
        language,
        audio,
        fileName: att.file_name,
        mimeType: att.mime_type,
        s3Bucket: att.storage_bucket,
        s3Key: att.storage_key,
        householdId,
        attachmentId: att.id,
      });

      await prisma.therapy_treatment_attachments.update({
        where: { id: att.id },
        data: {
          transcription_status: "completed",
          transcription_text: text,
          transcription_provider: provider,
          transcribed_at: new Date(),
          transcription_error: null,
        },
      });

      return NextResponse.json({
        transcription_text: text,
        transcription_provider: provider,
        transcription_status: "completed",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Transcription failed";
      await prisma.therapy_treatment_attachments.update({
        where: { id: att.id },
        data: {
          transcription_status: "failed",
          transcription_error: message.slice(0, 2000),
        },
      });
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (error) {
    console.error("Treatment attachment transcribe failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed" },
      { status: 500 },
    );
  }
}
