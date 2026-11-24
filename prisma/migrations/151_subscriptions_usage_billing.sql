-- Flexible, usage-based subscriptions: no fixed renewal day, and the fee may be unknown.

ALTER TYPE subscription_billing_interval ADD VALUE IF NOT EXISTS 'usage';

ALTER TABLE subscriptions ALTER COLUMN fee_amount DROP NOT NULL;
