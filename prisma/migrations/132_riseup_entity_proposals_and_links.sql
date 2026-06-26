-- 132_riseup_entity_proposals_and_links.sql
-- Stage RiseUp-inferred entity proposals and typed transaction/entity links.

CREATE TABLE IF NOT EXISTS "riseup_import_proposals" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "import_audit_id" UUID REFERENCES "riseup_import_audits"("id") ON DELETE SET NULL,
  "proposal_kind" TEXT NOT NULL,
  "entity_kind" TEXT NOT NULL,
  "target_entity_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'proposed',
  "confidence" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "payload_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "proposed_changes_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "decision_notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_riseup_import_proposals_household_status"
  ON "riseup_import_proposals" ("household_id", "status");

CREATE INDEX IF NOT EXISTS "idx_riseup_import_proposals_household_entity"
  ON "riseup_import_proposals" ("household_id", "entity_kind");

CREATE INDEX IF NOT EXISTS "idx_riseup_import_proposals_import_audit"
  ON "riseup_import_proposals" ("import_audit_id");

CREATE TABLE IF NOT EXISTS "transaction_entity_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "transaction_id" UUID NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
  "entity_kind" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'riseup_import',
  "confidence" TEXT,
  "import_audit_id" UUID REFERENCES "riseup_import_audits"("id") ON DELETE SET NULL,
  "proposal_id" UUID REFERENCES "riseup_import_proposals"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "transaction_entity_links_unique_idx"
  ON "transaction_entity_links" ("household_id", "transaction_id", "entity_kind", "entity_id");

CREATE INDEX IF NOT EXISTS "idx_transaction_entity_links_household_entity"
  ON "transaction_entity_links" ("household_id", "entity_kind", "entity_id");

CREATE INDEX IF NOT EXISTS "idx_transaction_entity_links_transaction"
  ON "transaction_entity_links" ("transaction_id");

CREATE INDEX IF NOT EXISTS "idx_transaction_entity_links_import_audit"
  ON "transaction_entity_links" ("import_audit_id");

CREATE INDEX IF NOT EXISTS "idx_transaction_entity_links_proposal"
  ON "transaction_entity_links" ("proposal_id");

CREATE TABLE IF NOT EXISTS "riseup_import_proposal_transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "proposal_id" UUID NOT NULL REFERENCES "riseup_import_proposals"("id") ON DELETE CASCADE,
  "transaction_id" UUID REFERENCES "transactions"("id") ON DELETE SET NULL,
  "riseup_import_key" TEXT,
  "row_index" INTEGER,
  "support_role" TEXT NOT NULL,
  "confidence" TEXT,
  "row_snapshot_json" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_riseup_proposal_transactions_household_proposal"
  ON "riseup_import_proposal_transactions" ("household_id", "proposal_id");

CREATE INDEX IF NOT EXISTS "idx_riseup_proposal_transactions_transaction"
  ON "riseup_import_proposal_transactions" ("transaction_id");

CREATE INDEX IF NOT EXISTS "idx_riseup_proposal_transactions_import_key"
  ON "riseup_import_proposal_transactions" ("riseup_import_key");

CREATE OR REPLACE FUNCTION "set_riseup_import_proposals_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_riseup_import_proposals_updated_at" ON "riseup_import_proposals";
CREATE TRIGGER "trg_riseup_import_proposals_updated_at"
BEFORE UPDATE ON "riseup_import_proposals"
FOR EACH ROW
EXECUTE FUNCTION "set_riseup_import_proposals_updated_at"();

CREATE OR REPLACE FUNCTION "set_transaction_entity_links_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_transaction_entity_links_updated_at" ON "transaction_entity_links";
CREATE TRIGGER "trg_transaction_entity_links_updated_at"
BEFORE UPDATE ON "transaction_entity_links"
FOR EACH ROW
EXECUTE FUNCTION "set_transaction_entity_links_updated_at"();
