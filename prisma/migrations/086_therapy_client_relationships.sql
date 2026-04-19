-- Links between therapy clients (directed): for from_client, to_client is their mother/father/etc.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_client_relationship_type') THEN
    CREATE TYPE therapy_client_relationship_type AS ENUM ('mother', 'father', 'husband', 'wife', 'referred_by');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS therapy_client_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  from_client_id UUID NOT NULL,
  to_client_id UUID NOT NULL,
  relationship therapy_client_relationship_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT therapy_client_relationships_from_to_relationship_key UNIQUE (from_client_id, to_client_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_therapy_client_relationships_household ON therapy_client_relationships(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_client_relationships_from ON therapy_client_relationships(from_client_id);
CREATE INDEX IF NOT EXISTS idx_therapy_client_relationships_to ON therapy_client_relationships(to_client_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_client_relationships_household_id_fkey') THEN
    ALTER TABLE therapy_client_relationships
      ADD CONSTRAINT therapy_client_relationships_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_client_relationships_from_client_id_fkey') THEN
    ALTER TABLE therapy_client_relationships
      ADD CONSTRAINT therapy_client_relationships_from_client_id_fkey
      FOREIGN KEY (from_client_id) REFERENCES therapy_clients(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_client_relationships_to_client_id_fkey') THEN
    ALTER TABLE therapy_client_relationships
      ADD CONSTRAINT therapy_client_relationships_to_client_id_fkey
      FOREIGN KEY (to_client_id) REFERENCES therapy_clients(id) ON DELETE CASCADE;
  END IF;
END $$;
