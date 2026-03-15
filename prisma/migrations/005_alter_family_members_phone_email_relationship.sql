-- 005: Add phone, email, relationship to family_members
-- Type: ALTER

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS relationship VARCHAR(64);
