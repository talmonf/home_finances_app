-- Optional purchase metadata: seller, odometer at purchase, extra one-off costs.

ALTER TABLE "cars" ADD COLUMN IF NOT EXISTS "purchased_from" TEXT;
ALTER TABLE "cars" ADD COLUMN IF NOT EXISTS "purchase_odometer_km" INTEGER;
ALTER TABLE "cars" ADD COLUMN IF NOT EXISTS "extra_purchase_costs" DECIMAL(15, 2);
ALTER TABLE "cars" ADD COLUMN IF NOT EXISTS "extra_purchase_costs_notes" TEXT;
