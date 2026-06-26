-- 129_rental_utilities.sql
-- Rental-scoped utility details for tenant leases.

CREATE TABLE IF NOT EXISTS "rental_utilities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "rental_id" UUID NOT NULL,
  "utility_type" property_utility_type NOT NULL,
  "utility_company" TEXT NOT NULL,
  "account_number" TEXT,
  "meter_number" TEXT,
  "last_meter_reading" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "rental_utilities_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE,
  CONSTRAINT "rental_utilities_rental_id_fkey"
    FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "rental_utilities_household_id_idx"
  ON "rental_utilities" ("household_id");

CREATE INDEX IF NOT EXISTS "rental_utilities_rental_id_idx"
  ON "rental_utilities" ("rental_id");
