-- Per-user digest email for upcoming renewals & deadlines.

CREATE TYPE renewal_email_frequency AS ENUM ('daily', 'weekly', 'monthly');

CREATE TABLE renewal_email_subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  recipient_email  TEXT NULL,
  frequency        renewal_email_frequency NOT NULL,
  day_of_week      SMALLINT NULL,
  day_of_month     SMALLINT NULL,
  send_hour        SMALLINT NOT NULL DEFAULT 7 CHECK (send_hour BETWEEN 0 AND 23),
  timezone         TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
  days_ahead       INTEGER NOT NULL DEFAULT 30 CHECK (days_ahead BETWEEN 1 AND 365),
  last_sent_at     TIMESTAMPTZ NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE renewal_email_deliveries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id    UUID NOT NULL REFERENCES renewal_email_subscriptions(id) ON DELETE CASCADE,
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_email    TEXT NOT NULL,
  item_count         INTEGER NOT NULL,
  status             TEXT NOT NULL,
  error_message      TEXT NULL,
  provider_msg_id    TEXT NULL
);

CREATE INDEX renewal_email_deliveries_subscription_id_idx
  ON renewal_email_deliveries (subscription_id, sent_at DESC);
