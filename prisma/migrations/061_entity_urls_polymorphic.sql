-- Polymorphic URLs attached to household entities (insurance_policy, savings_policy for now).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_url_entity_kind') THEN
    CREATE TYPE "entity_url_entity_kind" AS ENUM ('insurance_policy', 'savings_policy');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "entity_urls" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "entity_kind" "entity_url_entity_kind" NOT NULL,
  "entity_id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "notes" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "entity_urls_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_entity_urls_household_kind_entity"
  ON "entity_urls" ("household_id", "entity_kind", "entity_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entity_urls_household_id_fkey'
  ) THEN
    ALTER TABLE "entity_urls"
      ADD CONSTRAINT "entity_urls_household_id_fkey"
      FOREIGN KEY ("household_id") REFERENCES "households"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
