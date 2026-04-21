CREATE TABLE IF NOT EXISTS private_clinic_backup_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_by_super_admin_email text NULL,
  snapshot_version integer NOT NULL,
  snapshot_checksum text NOT NULL,
  snapshot_bytes integer NOT NULL,
  snapshot_json jsonb NOT NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_private_clinic_backup_snapshots_household_created_at
  ON private_clinic_backup_snapshots (household_id, created_at DESC);

CREATE TABLE IF NOT EXISTS general_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NULL REFERENCES households(id) ON DELETE SET NULL,
  actor_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  actor_is_super_admin boolean NOT NULL DEFAULT false,
  actor_email text NULL,
  actor_name text NULL,
  feature text NOT NULL,
  action text NOT NULL,
  status text NOT NULL,
  summary text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_general_audit_events_created_at
  ON general_audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_general_audit_events_feature_created_at
  ON general_audit_events (feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_general_audit_events_household_created_at
  ON general_audit_events (household_id, created_at DESC);
