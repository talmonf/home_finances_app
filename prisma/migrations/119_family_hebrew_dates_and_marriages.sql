-- Hebrew birthday components on family members; household marriage records with dual wedding dates.

ALTER TABLE family_members
  ADD COLUMN hebrew_date_of_birth_day SMALLINT,
  ADD COLUMN hebrew_date_of_birth_month SMALLINT,
  ADD COLUMN hebrew_date_of_birth_year SMALLINT;

ALTER TABLE family_members
  ADD CONSTRAINT family_members_hebrew_dob_day_check
    CHECK (hebrew_date_of_birth_day IS NULL OR (hebrew_date_of_birth_day >= 1 AND hebrew_date_of_birth_day <= 30)),
  ADD CONSTRAINT family_members_hebrew_dob_month_check
    CHECK (hebrew_date_of_birth_month IS NULL OR (hebrew_date_of_birth_month >= 1 AND hebrew_date_of_birth_month <= 13)),
  ADD CONSTRAINT family_members_hebrew_dob_year_check
    CHECK (hebrew_date_of_birth_year IS NULL OR hebrew_date_of_birth_year >= 1);

CREATE TABLE family_marriages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id         UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  spouse_a_id          UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  spouse_b_id          UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  wedding_date         DATE,
  wedding_hebrew_day   SMALLINT,
  wedding_hebrew_month SMALLINT,
  wedding_hebrew_year  SMALLINT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT family_marriages_spouse_order CHECK (spouse_a_id < spouse_b_id),
  CONSTRAINT family_marriages_wedding_hebrew_day_check
    CHECK (wedding_hebrew_day IS NULL OR (wedding_hebrew_day >= 1 AND wedding_hebrew_day <= 30)),
  CONSTRAINT family_marriages_wedding_hebrew_month_check
    CHECK (wedding_hebrew_month IS NULL OR (wedding_hebrew_month >= 1 AND wedding_hebrew_month <= 13)),
  CONSTRAINT family_marriages_wedding_hebrew_year_check
    CHECK (wedding_hebrew_year IS NULL OR wedding_hebrew_year >= 1)
);

CREATE UNIQUE INDEX family_marriages_household_spouses_unique
  ON family_marriages (household_id, spouse_a_id, spouse_b_id);

CREATE INDEX family_marriages_household_id_idx ON family_marriages (household_id);
