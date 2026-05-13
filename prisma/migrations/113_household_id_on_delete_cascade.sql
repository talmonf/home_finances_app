-- Align legacy foreign keys so deleting a household row does not fail with NO ACTION / RESTRICT.
-- Super-admin household deletion expects all child rows to go away with the household.
--
-- 1) Break users ↔ family_members ordering deadlock: when a family_member row is deleted,
--    clear users.family_member_id instead of blocking.
-- 2) For every single-column FK (household_id) → households(id) that is not already CASCADE,
--    replace it with ON DELETE CASCADE.

-- --- 1) users.family_member_id → ON DELETE SET NULL ---------------------------------------------
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT c.conname
  INTO con_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN unnest(c.conkey) AS ck(attnum) ON true
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ck.attnum
  WHERE t.relname = 'users'
    AND c.contype = 'f'
    AND a.attname = 'family_member_id'
  LIMIT 1;

  IF con_name IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', con_name);
  EXECUTE format(
    'ALTER TABLE users ADD CONSTRAINT %I FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL',
    con_name
  );
END $$;

-- --- 2) household_id → households(id) ON DELETE CASCADE ----------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname AS cname, rel.relname AS tname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_class ref ON ref.oid = c.confrelid
    JOIN unnest(c.conkey) AS ck(attnum) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ck.attnum
    WHERE c.contype = 'f'
      AND ref.relname = 'households'
      AND rel.relname <> 'households'
      AND a.attname = 'household_id'
      AND cardinality(c.conkey) = 1
      AND c.confdeltype <> 'c'::"char"
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.tname, r.cname);
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE',
        r.tname,
        r.cname
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '113_household_id_on_delete_cascade: skipped %.%; reason: %', r.tname, r.cname, SQLERRM;
    END;
  END LOOP;
END $$;
