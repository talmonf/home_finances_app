-- 034_cars_domain.sql
-- Cars domain + insurance/transaction linkage

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_purchase_payment_method') THEN
    CREATE TYPE car_purchase_payment_method AS ENUM ('cash', 'credit_card', 'bank_account', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  maker TEXT NOT NULL,
  model TEXT NOT NULL,
  model_year INTEGER NULL,
  plate_number TEXT NULL,
  vin TEXT NULL,
  notes TEXT NULL,
  purchase_date DATE NULL,
  purchase_amount NUMERIC(15,2) NULL,
  purchase_payment_method car_purchase_payment_method NULL,
  purchase_credit_card_id UUID NULL,
  purchase_bank_account_id UUID NULL,
  sold_at DATE NULL,
  sold_amount NUMERIC(15,2) NULL,
  sold_to TEXT NULL,
  main_driver_family_member_id UUID NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cars_household ON cars(household_id);
CREATE INDEX IF NOT EXISTS idx_cars_main_driver ON cars(main_driver_family_member_id);
CREATE INDEX IF NOT EXISTS idx_cars_purchase_date ON cars(purchase_date);
CREATE INDEX IF NOT EXISTS idx_cars_sold_at ON cars(sold_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_household_id_fkey'
  ) THEN
    ALTER TABLE cars
      ADD CONSTRAINT cars_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_main_driver_family_member_id_fkey'
  ) THEN
    ALTER TABLE cars
      ADD CONSTRAINT cars_main_driver_family_member_id_fkey
      FOREIGN KEY (main_driver_family_member_id) REFERENCES family_members(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_purchase_credit_card_id_fkey'
  ) THEN
    ALTER TABLE cars
      ADD CONSTRAINT cars_purchase_credit_card_id_fkey
      FOREIGN KEY (purchase_credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_purchase_bank_account_id_fkey'
  ) THEN
    ALTER TABLE cars
      ADD CONSTRAINT cars_purchase_bank_account_id_fkey
      FOREIGN KEY (purchase_bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS car_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  car_id UUID NOT NULL,
  provider_name TEXT NOT NULL,
  serviced_at DATE NOT NULL,
  cost_amount NUMERIC(15,2) NULL,
  odometer_km INTEGER NULL,
  credit_card_id UUID NULL,
  bank_account_id UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_car_services_household ON car_services(household_id);
CREATE INDEX IF NOT EXISTS idx_car_services_car ON car_services(car_id);
CREATE INDEX IF NOT EXISTS idx_car_services_serviced_at ON car_services(serviced_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'car_services_household_id_fkey'
  ) THEN
    ALTER TABLE car_services
      ADD CONSTRAINT car_services_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'car_services_car_id_fkey'
  ) THEN
    ALTER TABLE car_services
      ADD CONSTRAINT car_services_car_id_fkey
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'car_services_credit_card_id_fkey'
  ) THEN
    ALTER TABLE car_services
      ADD CONSTRAINT car_services_credit_card_id_fkey
      FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'car_services_bank_account_id_fkey'
  ) THEN
    ALTER TABLE car_services
      ADD CONSTRAINT car_services_bank_account_id_fkey
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS car_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  car_id UUID NOT NULL,
  renewed_at DATE NULL,
  expires_at DATE NOT NULL,
  cost_amount NUMERIC(15,2) NULL,
  credit_card_id UUID NULL,
  bank_account_id UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_car_licenses_household ON car_licenses(household_id);
CREATE INDEX IF NOT EXISTS idx_car_licenses_car ON car_licenses(car_id);
CREATE INDEX IF NOT EXISTS idx_car_licenses_expires_at ON car_licenses(expires_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'car_licenses_household_id_fkey'
  ) THEN
    ALTER TABLE car_licenses
      ADD CONSTRAINT car_licenses_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'car_licenses_car_id_fkey'
  ) THEN
    ALTER TABLE car_licenses
      ADD CONSTRAINT car_licenses_car_id_fkey
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'car_licenses_credit_card_id_fkey'
  ) THEN
    ALTER TABLE car_licenses
      ADD CONSTRAINT car_licenses_credit_card_id_fkey
      FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'car_licenses_bank_account_id_fkey'
  ) THEN
    ALTER TABLE car_licenses
      ADD CONSTRAINT car_licenses_bank_account_id_fkey
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE insurance_policies
  ADD COLUMN IF NOT EXISTS car_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_insurance_policies_car ON insurance_policies(car_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'insurance_policies_car_id_fkey'
  ) THEN
    ALTER TABLE insurance_policies
      ADD CONSTRAINT insurance_policies_car_id_fkey
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS car_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_car_id ON transactions(car_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_car_id_fkey'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_car_id_fkey
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL;
  END IF;
END $$;
