-- Optional job on subscriptions; optional job + subscription link on transactions.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS job_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_household_job
  ON subscriptions (household_id, job_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_job_id_fkey'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS job_id UUID NULL;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS subscription_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_household_job
  ON transactions (household_id, job_id);

CREATE INDEX IF NOT EXISTS idx_transactions_household_subscription
  ON transactions (household_id, subscription_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_job_id_fkey'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_subscription_id_fkey'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_subscription_id_fkey
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;
  END IF;
END $$;
