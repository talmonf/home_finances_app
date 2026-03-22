-- 016_bank_account_members.sql
-- Many-to-many: which family members are associated with a bank account.
-- Safe to run if the table already exists (IF NOT EXISTS). If your DB has a different
-- shape, reconcile manually before relying on the app.

CREATE TABLE IF NOT EXISTS "bank_account_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "bank_account_id" UUID NOT NULL,
  "family_member_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bank_account_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_account_members_bank_account_id_fkey"
    FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bank_account_members_family_member_id_fkey"
    FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_account_members_bank_account_id_family_member_id_key"
  ON "bank_account_members" ("bank_account_id", "family_member_id");

CREATE INDEX IF NOT EXISTS "idx_bank_account_members_bank_account"
  ON "bank_account_members" ("bank_account_id");

CREATE INDEX IF NOT EXISTS "idx_bank_account_members_family_member"
  ON "bank_account_members" ("family_member_id");
