-- Useful links: system-wide, per-household, or per-user; scoped by dashboard section_id.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'useful_link_scope') THEN
    CREATE TYPE "useful_link_scope" AS ENUM ('system', 'household', 'user');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "useful_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "scope" "useful_link_scope" NOT NULL,
  "section_id" TEXT NOT NULL,
  "household_id" UUID,
  "user_id" UUID,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "notes" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "useful_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "useful_links_scope_shape_check" CHECK (
    ("scope" = 'system' AND "household_id" IS NULL AND "user_id" IS NULL) OR
    ("scope" = 'household' AND "household_id" IS NOT NULL AND "user_id" IS NULL) OR
    ("scope" = 'user' AND "household_id" IS NOT NULL AND "user_id" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "idx_useful_links_scope_section" ON "useful_links" ("scope", "section_id");
CREATE INDEX IF NOT EXISTS "idx_useful_links_household_section" ON "useful_links" ("household_id", "section_id");
CREATE INDEX IF NOT EXISTS "idx_useful_links_user_section" ON "useful_links" ("household_id", "user_id", "section_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'useful_links_household_id_fkey'
  ) THEN
    ALTER TABLE "useful_links"
      ADD CONSTRAINT "useful_links_household_id_fkey"
      FOREIGN KEY ("household_id") REFERENCES "households"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'useful_links_user_id_fkey'
  ) THEN
    ALTER TABLE "useful_links"
      ADD CONSTRAINT "useful_links_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
