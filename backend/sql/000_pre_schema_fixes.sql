-- Repair legacy duplicated plans before enforcing UNIQUE(name)
DO $$
BEGIN
  IF to_regclass('public.plans') IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.churches') IS NOT NULL THEN
    WITH ranked AS (
      SELECT
        id,
        name,
        FIRST_VALUE(id) OVER (PARTITION BY name ORDER BY created_at ASC, id ASC) AS keep_id,
        ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC, id ASC) AS rn
      FROM plans
    )
    UPDATE churches c
    SET plan_id = ranked.keep_id
    FROM ranked
    WHERE c.plan_id = ranked.id
      AND ranked.rn > 1;
  END IF;

  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC, id ASC) AS rn
    FROM plans
  )
  DELETE FROM plans p
  USING ranked
  WHERE p.id = ranked.id
    AND ranked.rn > 1;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.plans'::regclass
      AND contype = 'u'
      AND conname IN ('plans_name_key', 'plans_name_unique')
  ) THEN
    ALTER TABLE plans ADD CONSTRAINT plans_name_unique UNIQUE (name);
  END IF;
END $$;
