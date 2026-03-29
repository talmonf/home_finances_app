-- 024_medical_appointments_payment_method_nullable.sql
-- Payment method may be unknown when the appointment is booked; allow NULL.

ALTER TABLE "medical_appointments"
  ALTER COLUMN "payment_method" DROP NOT NULL;
