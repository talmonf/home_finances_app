-- Receipt metadata: optional program; client when recipient is a client (UI enforces).

ALTER TABLE "therapy_receipts"
  ADD COLUMN IF NOT EXISTS "client_id" uuid,
  ADD COLUMN IF NOT EXISTS "program_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_receipts_client_id_fkey') THEN
    ALTER TABLE "therapy_receipts"
      ADD CONSTRAINT "therapy_receipts_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "therapy_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_receipts_program_id_fkey') THEN
    ALTER TABLE "therapy_receipts"
      ADD CONSTRAINT "therapy_receipts_program_id_fkey"
      FOREIGN KEY ("program_id") REFERENCES "therapy_service_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_therapy_receipts_client_id" ON "therapy_receipts" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_therapy_receipts_program_id" ON "therapy_receipts" ("program_id");
