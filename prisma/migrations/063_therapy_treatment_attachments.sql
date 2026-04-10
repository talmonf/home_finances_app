-- Treatment attachments (S3) + optional transcription metadata for Private Clinic.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_treatment_attachment_transcription_status') THEN
    CREATE TYPE "therapy_treatment_attachment_transcription_status" AS ENUM ('none', 'pending', 'completed', 'failed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "therapy_treatment_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "treatment_id" UUID NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "byte_size" INTEGER,
  "storage_bucket" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "transcription_text" TEXT,
  "transcription_language" TEXT,
  "transcription_status" "therapy_treatment_attachment_transcription_status" NOT NULL DEFAULT 'none',
  "transcription_error" TEXT,
  "transcribed_at" TIMESTAMP(3),
  "transcription_provider" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "therapy_treatment_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_therapy_treatment_attachments_household_treatment"
  ON "therapy_treatment_attachments" ("household_id", "treatment_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'therapy_treatment_attachments_household_id_fkey'
  ) THEN
    ALTER TABLE "therapy_treatment_attachments"
      ADD CONSTRAINT "therapy_treatment_attachments_household_id_fkey"
      FOREIGN KEY ("household_id") REFERENCES "households"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'therapy_treatment_attachments_treatment_id_fkey'
  ) THEN
    ALTER TABLE "therapy_treatment_attachments"
      ADD CONSTRAINT "therapy_treatment_attachments_treatment_id_fkey"
      FOREIGN KEY ("treatment_id") REFERENCES "therapy_treatments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
