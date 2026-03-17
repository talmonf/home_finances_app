-- 007_properties_and_utilities.sql
-- Creates enums and tables for household homes/properties and their utility providers.
-- Run this if your DB does not already have these objects.

-- Enums (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_ownership_type') THEN
    CREATE TYPE property_ownership_type AS ENUM ('owned', 'rental', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_utility_type') THEN
    CREATE TYPE property_utility_type AS ENUM ('electricity', 'water', 'internet', 'telephone', 'gas', 'other');
  END IF;
END
$$;

-- Properties (household homes)
CREATE TABLE IF NOT EXISTS properties (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id         UUID         NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name                 VARCHAR(255) NOT NULL,
  is_primary_residence BOOLEAN      NOT NULL DEFAULT FALSE,
  address_line_1       VARCHAR(255) NOT NULL,
  address_line_2       VARCHAR(255),
  city                 VARCHAR(255) NOT NULL,
  postal_code          VARCHAR(64),
  country              VARCHAR(8)   NOT NULL DEFAULT 'IL',
  phone                VARCHAR(64),
  ownership_type       property_ownership_type NOT NULL,
  owner_name           VARCHAR(255),
  created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_household ON properties (household_id);

-- Property utilities (utility companies per property)
CREATE TABLE IF NOT EXISTS property_utilities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID         NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  property_id    UUID         NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  utility_type   property_utility_type NOT NULL,
  provider_name  VARCHAR(255) NOT NULL,
  payee_id       UUID REFERENCES payees(id),
  account_number VARCHAR(128),
  notes          TEXT,
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_utilities_household ON property_utilities (household_id);
CREATE INDEX IF NOT EXISTS idx_property_utilities_property ON property_utilities (property_id);
