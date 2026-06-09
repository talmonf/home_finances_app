-- Household special dates (yahrzeit, bar mitzvah, etc.) with optional family member link and dual calendar dates.

CREATE TYPE family_special_date_event_type AS ENUM (
  'death',
  'bar_mitzvah',
  'bat_mitzvah',
  'engagement',
  'aliyah',
  'graduation',
  'other'
);

CREATE TABLE family_special_dates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  display_name     TEXT,
  event_type       family_special_date_event_type NOT NULL,
  event_type_other TEXT,
  gregorian_date   DATE,
  hebrew_day       SMALLINT,
  hebrew_month     SMALLINT,
  hebrew_year      SMALLINT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT family_special_dates_hebrew_day_check
    CHECK (hebrew_day IS NULL OR (hebrew_day >= 1 AND hebrew_day <= 30)),
  CONSTRAINT family_special_dates_hebrew_month_check
    CHECK (hebrew_month IS NULL OR (hebrew_month >= 1 AND hebrew_month <= 13)),
  CONSTRAINT family_special_dates_hebrew_year_check
    CHECK (hebrew_year IS NULL OR hebrew_year >= 1),
  CONSTRAINT family_special_dates_at_least_one_date_check
    CHECK (
      gregorian_date IS NOT NULL
      OR (hebrew_day IS NOT NULL AND hebrew_month IS NOT NULL)
    ),
  CONSTRAINT family_special_dates_display_name_check
    CHECK (
      family_member_id IS NOT NULL
      OR (display_name IS NOT NULL AND length(trim(display_name)) > 0)
    ),
  CONSTRAINT family_special_dates_event_type_other_check
    CHECK (
      event_type <> 'other'
      OR (event_type_other IS NOT NULL AND length(trim(event_type_other)) > 0)
    )
);

CREATE INDEX family_special_dates_household_id_idx ON family_special_dates (household_id);
CREATE INDEX family_special_dates_family_member_id_idx ON family_special_dates (family_member_id);
