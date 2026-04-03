-- Petrol fill-ups per car: litres, odometer, optional link to one bank transaction.

CREATE TABLE IF NOT EXISTS "car_petrol_fillups" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "car_id" UUID NOT NULL,
    "filled_at" TIMESTAMP(3) NOT NULL,
    "amount_paid" DECIMAL(15, 2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "litres" DECIMAL(12, 3) NOT NULL,
    "odometer_km" INTEGER NOT NULL,
    "transaction_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "car_petrol_fillups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "car_petrol_fillups_transaction_id_key"
    ON "car_petrol_fillups"("transaction_id");

CREATE INDEX IF NOT EXISTS "car_petrol_fillups_household_id_car_id_idx"
    ON "car_petrol_fillups"("household_id", "car_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'car_petrol_fillups_household_id_fkey'
    ) THEN
        ALTER TABLE "car_petrol_fillups"
            ADD CONSTRAINT "car_petrol_fillups_household_id_fkey"
            FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'car_petrol_fillups_car_id_fkey'
    ) THEN
        ALTER TABLE "car_petrol_fillups"
            ADD CONSTRAINT "car_petrol_fillups_car_id_fkey"
            FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'car_petrol_fillups_transaction_id_fkey'
    ) THEN
        ALTER TABLE "car_petrol_fillups"
            ADD CONSTRAINT "car_petrol_fillups_transaction_id_fkey"
            FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
