-- Password policy: first-login / admin reset flag, rotation anchor, and migration backfill.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);
UPDATE "users"
SET "password_changed_at" = COALESCE("last_login_at", "created_at", NOW())
WHERE "password_changed_at" IS NULL;
ALTER TABLE "users" ALTER COLUMN "password_changed_at" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_changed_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "super_admins" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "super_admins" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);
UPDATE "super_admins"
SET "password_changed_at" = COALESCE("last_login_at", "created_at", NOW())
WHERE "password_changed_at" IS NULL;
ALTER TABLE "super_admins" ALTER COLUMN "password_changed_at" SET NOT NULL;
ALTER TABLE "super_admins" ALTER COLUMN "password_changed_at" SET DEFAULT CURRENT_TIMESTAMP;
