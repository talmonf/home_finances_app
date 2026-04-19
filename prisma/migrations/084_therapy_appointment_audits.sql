CREATE TYPE therapy_appointment_audit_action AS ENUM (
  'create',
  'update',
  'reschedule',
  'cancel',
  'delete'
);

CREATE TABLE IF NOT EXISTS therapy_appointment_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES therapy_appointments(id) ON DELETE SET NULL,
  action therapy_appointment_audit_action NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_appointment_audits_household_created
  ON therapy_appointment_audits (household_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_therapy_appointment_audits_user_created
  ON therapy_appointment_audits (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_therapy_appointment_audits_appointment
  ON therapy_appointment_audits (appointment_id);
