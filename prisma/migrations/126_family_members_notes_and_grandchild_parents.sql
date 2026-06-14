-- 126: family_members notes and optional parent links for grandchildren
-- Type: ALTER

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS parent_a_family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_b_family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS family_members_parent_a_family_member_id_idx
  ON family_members (parent_a_family_member_id);

CREATE INDEX IF NOT EXISTS family_members_parent_b_family_member_id_idx
  ON family_members (parent_b_family_member_id);
