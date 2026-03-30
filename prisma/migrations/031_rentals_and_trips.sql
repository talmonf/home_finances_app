-- 031_rentals_and_trips.sql
-- Adds rentals and trips entities, plus transaction links.
--
-- Idempotent: safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rental_type') THEN
    CREATE TYPE rental_type AS ENUM ('long_term', 'short_term');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rental_payment_method') THEN
    CREATE TYPE rental_payment_method AS ENUM ('cash', 'credit_card', 'bank_account', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  property_id UUID NOT NULL,
  rental_type rental_type NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  monthly_payment NUMERIC(15,2) NULL,
  short_term_total_payment NUMERIC(15,2) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'ILS',
  payment_method rental_payment_method NULL,
  credit_card_id UUID NULL,
  bank_account_id UUID NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rental_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rental_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  rental_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NULL,
  storage_bucket TEXT NULL,
  storage_key TEXT NOT NULL,
  storage_url TEXT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  trip_type TEXT NULL,
  city TEXT NULL,
  country TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  family_member_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS rental_id UUID NULL,
  ADD COLUMN IF NOT EXISTS trip_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rentals_household_id_fkey') THEN
    ALTER TABLE rentals
      ADD CONSTRAINT rentals_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rentals_property_id_fkey') THEN
    ALTER TABLE rentals
      ADD CONSTRAINT rentals_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rentals_credit_card_id_fkey') THEN
    ALTER TABLE rentals
      ADD CONSTRAINT rentals_credit_card_id_fkey
      FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rentals_bank_account_id_fkey') THEN
    ALTER TABLE rentals
      ADD CONSTRAINT rentals_bank_account_id_fkey
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_tenants_rental_id_fkey') THEN
    ALTER TABLE rental_tenants
      ADD CONSTRAINT rental_tenants_rental_id_fkey
      FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_contracts_household_id_fkey') THEN
    ALTER TABLE rental_contracts
      ADD CONSTRAINT rental_contracts_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_contracts_rental_id_fkey') THEN
    ALTER TABLE rental_contracts
      ADD CONSTRAINT rental_contracts_rental_id_fkey
      FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trips_household_id_fkey') THEN
    ALTER TABLE trips
      ADD CONSTRAINT trips_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_family_members_trip_id_fkey') THEN
    ALTER TABLE trip_family_members
      ADD CONSTRAINT trip_family_members_trip_id_fkey
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_family_members_family_member_id_fkey') THEN
    ALTER TABLE trip_family_members
      ADD CONSTRAINT trip_family_members_family_member_id_fkey
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_rental_id_fkey') THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_rental_id_fkey
      FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_trip_id_fkey') THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_trip_id_fkey
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS trip_family_members_trip_id_family_member_id_key
  ON trip_family_members (trip_id, family_member_id);

CREATE INDEX IF NOT EXISTS rentals_household_id_idx ON rentals (household_id);
CREATE INDEX IF NOT EXISTS rentals_property_id_idx ON rentals (property_id);
CREATE INDEX IF NOT EXISTS rental_tenants_rental_id_idx ON rental_tenants (rental_id);
CREATE INDEX IF NOT EXISTS rental_contracts_household_id_idx ON rental_contracts (household_id);
CREATE INDEX IF NOT EXISTS rental_contracts_rental_id_idx ON rental_contracts (rental_id);
CREATE INDEX IF NOT EXISTS trips_household_id_idx ON trips (household_id);
CREATE INDEX IF NOT EXISTS transactions_rental_id_idx ON transactions (rental_id);
CREATE INDEX IF NOT EXISTS transactions_trip_id_idx ON transactions (trip_id);
