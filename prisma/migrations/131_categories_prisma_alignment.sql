-- 131_categories_prisma_alignment.sql
-- Harden legacy categories tables so Prisma category queries can run reliably.

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);

UPDATE "categories"
SET "name" = COALESCE(NULLIF(TRIM("name"), ''), 'Uncategorized')
WHERE "name" IS NULL OR TRIM("name") = '';

ALTER TABLE "categories"
  ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "parent_id" UUID;

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN;

UPDATE "categories"
SET "is_active" = TRUE
WHERE "is_active" IS NULL;

ALTER TABLE "categories"
  ALTER COLUMN "is_active" SET DEFAULT TRUE,
  ALTER COLUMN "is_active" SET NOT NULL;

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3);

UPDATE "categories"
SET "created_at" = CURRENT_TIMESTAMP
WHERE "created_at" IS NULL;

ALTER TABLE "categories"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "created_at" SET NOT NULL;

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);

UPDATE "categories"
SET "updated_at" = COALESCE("created_at", CURRENT_TIMESTAMP)
WHERE "updated_at" IS NULL;

ALTER TABLE "categories"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updated_at" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_parent_id_fkey'
  ) THEN
    ALTER TABLE "categories"
      ADD CONSTRAINT "categories_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_categories_household_active_name"
  ON "categories" ("household_id", "is_active", "name");
