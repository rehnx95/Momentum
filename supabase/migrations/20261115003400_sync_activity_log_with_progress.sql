CREATE OR REPLACE FUNCTION public.sync_activity_log_from_progress ()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  old_activity_date DATE;
  new_activity_date DATE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state = 'done' THEN
      new_activity_date := COALESCE(
        NEW.completed_on,
        (NEW.updated_at AT TIME ZONE 'UTC')::DATE
      );
      INSERT INTO public.activity_log AS existing_activity (user_id, date, count)
      VALUES (NEW.user_id, new_activity_date, 1)
      ON CONFLICT (user_id, date) DO UPDATE
      SET count = existing_activity.count + 1,
          updated_at = NOW();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.state = 'done' THEN
      old_activity_date := COALESCE(
        OLD.completed_on,
        (OLD.updated_at AT TIME ZONE 'UTC')::DATE
      );
      UPDATE public.activity_log
      SET count = GREATEST(count - 1, 0),
          updated_at = NOW()
      WHERE user_id = OLD.user_id
        AND date = old_activity_date;
      DELETE FROM public.activity_log
      WHERE user_id = OLD.user_id
        AND date = old_activity_date
        AND count = 0;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.state = 'done' THEN
    old_activity_date := COALESCE(
      OLD.completed_on,
      (OLD.updated_at AT TIME ZONE 'UTC')::DATE
    );
  END IF;
  IF NEW.state = 'done' THEN
    new_activity_date := COALESCE(
      NEW.completed_on,
      (NEW.updated_at AT TIME ZONE 'UTC')::DATE
    );
  END IF;

  IF OLD.state = 'done'
    AND (
      NEW.state <> 'done'
      OR OLD.user_id IS DISTINCT FROM NEW.user_id
      OR old_activity_date IS DISTINCT FROM new_activity_date
    )
  THEN
    UPDATE public.activity_log
    SET count = GREATEST(count - 1, 0),
        updated_at = NOW()
    WHERE user_id = OLD.user_id
      AND date = old_activity_date;
    DELETE FROM public.activity_log
    WHERE user_id = OLD.user_id
      AND date = old_activity_date
      AND count = 0;
  END IF;

  IF NEW.state = 'done'
    AND (
      OLD.state <> 'done'
      OR OLD.user_id IS DISTINCT FROM NEW.user_id
      OR old_activity_date IS DISTINCT FROM new_activity_date
    )
  THEN
    INSERT INTO public.activity_log AS existing_activity (user_id, date, count)
    VALUES (NEW.user_id, new_activity_date, 1)
    ON CONFLICT (user_id, date) DO UPDATE
    SET count = existing_activity.count + 1,
        updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_activity_log_from_progress ()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_activity_log_from_progress ON public.progress;
CREATE TRIGGER sync_activity_log_from_progress
AFTER INSERT OR UPDATE OR DELETE ON public.progress
FOR EACH ROW
EXECUTE FUNCTION public.sync_activity_log_from_progress ();

CREATE OR REPLACE FUNCTION public.delete_sheet_progress_for_owner (
  target_user_id UUID,
  template_id TEXT,
  sheet_uuid UUID,
  sheet_json JSONB
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  WITH sheet_problem_ids AS (
    SELECT
      'custom-' || sheet_uuid::TEXT || '::' || (problem.value->>'id') AS problem_id
    FROM jsonb_array_elements(
      COALESCE(sheet_json->'steps', '[]'::JSONB)
    ) AS step(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(step.value->'subsections', '[]'::JSONB)
    ) AS subsection(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(subsection.value->'problems', '[]'::JSONB)
    ) AS problem(value)
    WHERE sheet_uuid IS NOT NULL
      AND problem.value ? 'id'
    UNION
    SELECT
      CASE
        WHEN template_id = 'dsa' THEN problem.value->>'id'
        ELSE template_id || '::' || (problem.value->>'id')
      END AS problem_id
    FROM jsonb_array_elements(
      COALESCE(sheet_json->'steps', '[]'::JSONB)
    ) AS step(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(step.value->'subsections', '[]'::JSONB)
    ) AS subsection(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(subsection.value->'problems', '[]'::JSONB)
    ) AS problem(value)
    WHERE template_id IS NOT NULL
      AND problem.value ? 'id'
  )
  DELETE FROM public.progress AS progress_row
  USING sheet_problem_ids
  WHERE progress_row.user_id = target_user_id
    AND progress_row.problem_id = sheet_problem_ids.problem_id;
END;
$$;

UPDATE public.activity_log
SET count = 0
WHERE count <> 0;

INSERT INTO public.activity_log (user_id, date, count)
SELECT
  user_id,
  COALESCE(completed_on, (updated_at AT TIME ZONE 'UTC')::DATE),
  COUNT(*)::INTEGER
FROM public.progress
WHERE state = 'done'
GROUP BY user_id, COALESCE(completed_on, (updated_at AT TIME ZONE 'UTC')::DATE)
ON CONFLICT (user_id, date) DO UPDATE
SET count = EXCLUDED.count,
    updated_at = NOW();

DELETE FROM public.activity_log
WHERE count = 0;
