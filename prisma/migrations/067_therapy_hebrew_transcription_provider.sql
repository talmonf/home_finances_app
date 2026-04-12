-- Per-household Hebrew audio transcription backend (OpenRouter vs AWS Transcribe).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_hebrew_transcription_provider') THEN
    CREATE TYPE "therapy_hebrew_transcription_provider" AS ENUM ('openrouter', 'aws');
  END IF;
END
$$;

ALTER TABLE "therapy_settings"
  ADD COLUMN IF NOT EXISTS "hebrew_transcription_provider" "therapy_hebrew_transcription_provider" NOT NULL DEFAULT 'openrouter';
