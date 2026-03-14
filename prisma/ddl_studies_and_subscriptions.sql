-- DDL: Studies & Classes + Subscriptions
-- Run this after you have households, family_members, and credit_cards.
-- Requires: uuid-ossp (or gen_random_uuid()), family_members, credit_cards tables.

-- Enums
CREATE TYPE study_or_class_type AS ENUM ('study', 'class');

CREATE TYPE subscription_billing_interval AS ENUM ('monthly', 'annual');

-- Studies & Classes (linked to family member)
CREATE TABLE studies_and_classes (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id            UUID         NOT NULL REFERENCES households(id),
  family_member_id       UUID         NOT NULL REFERENCES family_members(id),
  name                   VARCHAR(255) NOT NULL,
  type                   study_or_class_type NOT NULL,
  start_date             DATE,
  end_date               DATE,
  expected_annual_cost    DECIMAL(15,2),
  number_of_years        INTEGER,
  description            TEXT,
  is_active              BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_studies_and_classes_household ON studies_and_classes (household_id);
CREATE INDEX idx_studies_and_classes_family_member ON studies_and_classes (family_member_id);
CREATE INDEX idx_studies_and_classes_type ON studies_and_classes (household_id, type, is_active);

-- Subscriptions (optional link to credit card)
CREATE TABLE subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id      UUID         NOT NULL REFERENCES households(id),
  name              VARCHAR(255) NOT NULL,
  start_date        DATE         NOT NULL,
  renewal_date      DATE         NOT NULL,
  fee_amount        DECIMAL(15,2) NOT NULL,
  billing_interval  subscription_billing_interval NOT NULL,
  credit_card_id    UUID REFERENCES credit_cards(id),
  description       TEXT,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_household ON subscriptions (household_id);
CREATE INDEX idx_subscriptions_credit_card ON subscriptions (credit_card_id);
CREATE INDEX idx_subscriptions_renewal ON subscriptions (household_id, renewal_date) WHERE is_active = TRUE;
