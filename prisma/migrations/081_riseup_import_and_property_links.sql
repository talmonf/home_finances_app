-- 081_riseup_import_and_property_links.sql
-- RiseUp import fields on transactions/source_records; property default; account/card → property; utility payment links.

-- Properties: one default per household (enforced by partial unique index).
ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "is_default_for_household" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "properties_one_default_per_household_idx"
  ON "properties" ("household_id")
  WHERE "is_default_for_household" = true AND "is_active" = true;

-- Bank accounts & credit cards → optional property
ALTER TABLE "bank_accounts"
  ADD COLUMN IF NOT EXISTS "property_id" UUID;

ALTER TABLE "credit_cards"
  ADD COLUMN IF NOT EXISTS "property_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_accounts_property_id_fkey') THEN
    ALTER TABLE "bank_accounts"
      ADD CONSTRAINT "bank_accounts_property_id_fkey"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_cards_property_id_fkey') THEN
    ALTER TABLE "credit_cards"
      ADD CONSTRAINT "credit_cards_property_id_fkey"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_bank_accounts_property_id" ON "bank_accounts" ("property_id");
CREATE INDEX IF NOT EXISTS "idx_credit_cards_property_id" ON "credit_cards" ("property_id");

-- Property utilities: optional payment instrument links
ALTER TABLE "property_utilities"
  ADD COLUMN IF NOT EXISTS "bank_account_id" UUID;

ALTER TABLE "property_utilities"
  ADD COLUMN IF NOT EXISTS "credit_card_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_utilities_bank_account_id_fkey') THEN
    ALTER TABLE "property_utilities"
      ADD CONSTRAINT "property_utilities_bank_account_id_fkey"
      FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_utilities_credit_card_id_fkey') THEN
    ALTER TABLE "property_utilities"
      ADD CONSTRAINT "property_utilities_credit_card_id_fkey"
      FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Source records: optional RiseUp raw row payload
ALTER TABLE "source_records"
  ADD COLUMN IF NOT EXISTS "riseup_row" JSONB;

-- Transactions: optional credit card, loan link, RiseUp metadata
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "credit_card_id" UUID;

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "loan_id" UUID;

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "riseup_charge_date" TIMESTAMP(3);

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "riseup_cashflow_month" TEXT;

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "riseup_is_zero_amount_pending" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "riseup_original_amount" DECIMAL(15, 2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_credit_card_id_fkey') THEN
    ALTER TABLE "transactions"
      ADD CONSTRAINT "transactions_credit_card_id_fkey"
      FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_loan_id_fkey') THEN
    ALTER TABLE "transactions"
      ADD CONSTRAINT "transactions_loan_id_fkey"
      FOREIGN KEY ("loan_id") REFERENCES "loans"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_transactions_credit_card_id" ON "transactions" ("credit_card_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_loan_id" ON "transactions" ("loan_id");
