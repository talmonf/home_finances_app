-- Soft-archive consultation types that are still referenced by consultations.

ALTER TABLE "therapy_consultation_types"
  ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
