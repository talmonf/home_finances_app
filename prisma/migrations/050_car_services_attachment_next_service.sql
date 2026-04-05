-- Car service: optional next service date (for upcoming renewals) and S3 attachment (service details).

ALTER TABLE car_services ADD COLUMN IF NOT EXISTS next_service_at DATE;

ALTER TABLE car_services ADD COLUMN IF NOT EXISTS receipt_file_name TEXT;
ALTER TABLE car_services ADD COLUMN IF NOT EXISTS receipt_mime_type TEXT;
ALTER TABLE car_services ADD COLUMN IF NOT EXISTS receipt_storage_bucket TEXT;
ALTER TABLE car_services ADD COLUMN IF NOT EXISTS receipt_storage_key TEXT;
ALTER TABLE car_services ADD COLUMN IF NOT EXISTS receipt_storage_url TEXT;
ALTER TABLE car_services ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS idx_car_services_next_service_at ON car_services (next_service_at);
