-- Per-user toggle for dashboard useful links (managed by super admin).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "show_useful_links" BOOLEAN NOT NULL DEFAULT true;
