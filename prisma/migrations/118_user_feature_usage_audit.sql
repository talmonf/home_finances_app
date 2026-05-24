CREATE TABLE IF NOT EXISTS user_feature_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain text NOT NULL,
  feature text NOT NULL,
  event_type text NOT NULL,
  action text NULL,
  resource_type text NULL,
  resource_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_feature_usage_events_domain_feature_created_at
  ON user_feature_usage_events (domain, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feature_usage_events_household_user_created_at
  ON user_feature_usage_events (household_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feature_usage_events_user_domain_feature_created_at
  ON user_feature_usage_events (user_id, domain, feature, created_at DESC);

CREATE TABLE IF NOT EXISTS user_feature_usage_rollups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain text NOT NULL,
  feature text NOT NULL,
  event_type text NOT NULL,
  first_used_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL,
  event_count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_feature_usage_rollups_key
    UNIQUE (household_id, user_id, domain, feature, event_type)
);

CREATE INDEX IF NOT EXISTS idx_user_feature_usage_rollups_household_domain
  ON user_feature_usage_rollups (household_id, domain);

CREATE INDEX IF NOT EXISTS idx_user_feature_usage_rollups_user_domain
  ON user_feature_usage_rollups (user_id, domain);
