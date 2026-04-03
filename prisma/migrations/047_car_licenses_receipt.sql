-- Optional receipt (PDF/photo) stored in S3 for car license renewals.

ALTER TABLE "car_licenses" ADD COLUMN IF NOT EXISTS "receipt_file_name" TEXT;
ALTER TABLE "car_licenses" ADD COLUMN IF NOT EXISTS "receipt_mime_type" TEXT;
ALTER TABLE "car_licenses" ADD COLUMN IF NOT EXISTS "receipt_storage_bucket" TEXT;
ALTER TABLE "car_licenses" ADD COLUMN IF NOT EXISTS "receipt_storage_key" TEXT;
ALTER TABLE "car_licenses" ADD COLUMN IF NOT EXISTS "receipt_storage_url" TEXT;
ALTER TABLE "car_licenses" ADD COLUMN IF NOT EXISTS "receipt_uploaded_at" TIMESTAMP(3);
