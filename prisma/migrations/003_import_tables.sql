-- 003: Import & transactions (categories, payees, documents, source_records, transactions)
-- Requires: households, bank_accounts, family_members, studies_and_classes.
-- Idempotent: safe to run if objects already exist.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_processing_status') THEN
    CREATE TYPE document_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_direction') THEN
    CREATE TYPE transaction_direction AS ENUM ('debit', 'credit');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('regular', 'transfer', 'donation', 'installment', 'salary', 'refund');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_import_status') THEN
    CREATE TYPE transaction_import_status AS ENUM ('pending_review', 'confirmed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS categories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  name         VARCHAR(255) NOT NULL,
  parent_id    UUID REFERENCES categories(id),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payees (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id),
  name         VARCHAR(255) NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id      UUID NOT NULL REFERENCES households(id),
  bank_account_id   UUID REFERENCES bank_accounts(id),
  file_name         VARCHAR(512) NOT NULL,
  file_type         VARCHAR(64) NOT NULL,
  storage_path      VARCHAR(1024),
  processing_status document_processing_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source_records (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  row_index        INTEGER NOT NULL,
  raw_date         VARCHAR(128),
  raw_amount       VARCHAR(128),
  raw_description  TEXT,
  raw_balance      VARCHAR(128),
  parsed_date      DATE,
  parsed_amount    DECIMAL(15,2),
  parsed_direction VARCHAR(32),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id           UUID NOT NULL REFERENCES households(id),
  bank_account_id        UUID REFERENCES bank_accounts(id),
  source_record_id       UUID REFERENCES source_records(id),
  document_id            UUID REFERENCES documents(id),
  transaction_date       DATE NOT NULL,
  amount                 DECIMAL(15,2) NOT NULL,
  transaction_direction  transaction_direction NOT NULL,
  transaction_type       transaction_type NOT NULL DEFAULT 'regular',
  description            TEXT,
  category_id            UUID REFERENCES categories(id),
  payee_id               UUID REFERENCES payees(id),
  notes                  TEXT,
  family_member_id       UUID REFERENCES family_members(id),
  study_or_class_id      UUID REFERENCES studies_and_classes(id),
  import_status          transaction_import_status NOT NULL DEFAULT 'pending_review',
  created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_household ON documents(household_id);
CREATE INDEX IF NOT EXISTS idx_source_records_document ON source_records(document_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_document ON transactions(document_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(household_id, transaction_date);
