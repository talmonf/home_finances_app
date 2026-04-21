-- Credit card no-charge policy validity date (separate from card expiry).
ALTER TABLE "credit_cards"
ADD COLUMN IF NOT EXISTS "no_charge_policy_valid_until" DATE;
