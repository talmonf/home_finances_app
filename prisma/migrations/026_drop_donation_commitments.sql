-- Single donations model: remove legacy donation_commitments; optional renewal reminder on donations.

DROP TABLE IF EXISTS "donation_commitments";

ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "renewal_date" TIMESTAMP(3);
