-- 077_credit_cards_family_member_nullable.sql
-- Make credit_cards.family_member_id nullable to support auto-created cards from import flows.

ALTER TABLE "credit_cards"
  ALTER COLUMN "family_member_id" DROP NOT NULL;
