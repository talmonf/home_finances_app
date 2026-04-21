-- Default usual treatment cost for receipt import (optional; user can override per run).
ALTER TABLE "therapy_settings" ADD COLUMN IF NOT EXISTS "usual_treatment_cost_for_import" DECIMAL(15,2);
