-- Optional link to the family member who filled the tank (16+ on fill date).

ALTER TABLE "car_petrol_fillups"
    ADD COLUMN IF NOT EXISTS "tanked_up_by_family_member_id" UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'car_petrol_fillups_tanked_up_by_family_member_id_fkey'
    ) THEN
        ALTER TABLE "car_petrol_fillups"
            ADD CONSTRAINT "car_petrol_fillups_tanked_up_by_family_member_id_fkey"
            FOREIGN KEY ("tanked_up_by_family_member_id") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "car_petrol_fillups_tanked_up_by_family_member_id_idx"
    ON "car_petrol_fillups"("tanked_up_by_family_member_id");
