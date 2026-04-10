-- Ensure unique constraints exist for ON CONFLICT clauses in seed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_name_key' AND conrelid = 'plans'::regclass
  ) THEN
    ALTER TABLE plans ADD CONSTRAINT plans_name_key UNIQUE (name);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
