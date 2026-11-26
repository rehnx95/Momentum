ALTER TABLE public.daily_logs
ADD COLUMN IF NOT EXISTS sleep_periods JSONB NOT NULL DEFAULT '[]'::JSONB;

UPDATE public.daily_logs
SET
  sleep_periods = JSONB_BUILD_ARRAY(
    JSONB_BUILD_OBJECT(
      'id',
      'legacy-sleep',
      'start',
      COALESCE(TO_CHAR(sleep_time, 'HH24:MI'), ''),
      'end',
      COALESCE(TO_CHAR(wake_time, 'HH24:MI'), '')
    )
  )
WHERE
  sleep_periods = '[]'::JSONB
  AND (
    sleep_time IS NOT NULL
    OR wake_time IS NOT NULL
  );

ALTER TABLE public.daily_logs
DROP CONSTRAINT IF EXISTS daily_logs_study_total_check,
DROP CONSTRAINT IF EXISTS daily_logs_custom_tasks_check,
DROP CONSTRAINT IF EXISTS daily_logs_sleep_periods_check;

ALTER TABLE public.daily_logs
ADD CONSTRAINT daily_logs_custom_tasks_check CHECK (
  JSONB_TYPEOF(custom_tasks) = 'array'
  AND OCTET_LENGTH(custom_tasks::TEXT) <= 1048576
),
ADD CONSTRAINT daily_logs_sleep_periods_check CHECK (
  JSONB_TYPEOF(sleep_periods) = 'array'
  AND JSONB_ARRAY_LENGTH(sleep_periods) <= 100
  AND OCTET_LENGTH(sleep_periods::TEXT) <= 65536
);

ALTER TABLE public.daily_logs
DROP COLUMN IF EXISTS dsa_slots,
DROP COLUMN IF EXISTS backend_slots,
DROP COLUMN IF EXISTS dsa_hours,
DROP COLUMN IF EXISTS backend_hours;

CREATE OR REPLACE FUNCTION public.set_daily_logs_updated_at () RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_logs_set_updated_at ON public.daily_logs;

CREATE TRIGGER daily_logs_set_updated_at
BEFORE UPDATE ON public.daily_logs FOR EACH ROW
EXECUTE FUNCTION public.set_daily_logs_updated_at ();

CREATE TABLE IF NOT EXISTS public.daily_log_timers (
  user_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  timer_id UUID NOT NULL UNIQUE,
  activity_id TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  color TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_log_timers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_log_timers_access_own ON public.daily_log_timers;

CREATE POLICY daily_log_timers_access_own ON public.daily_log_timers FOR ALL TO authenticated USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

DROP TRIGGER IF EXISTS daily_logs_activity_colors_cleanup ON public.daily_logs;

CREATE OR REPLACE FUNCTION public.prune_unused_activity_colors (p_user_id UUID) RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::TEXT), hashtext('activity-colors'));

  DELETE FROM public.activity_color_assignments AS assignments
  WHERE assignments.user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.daily_logs AS logs
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(logs.custom_tasks) = 'array' THEN logs.custom_tasks
          ELSE '[]'::JSONB
        END
      ) AS task (value)
      WHERE logs.user_id = assignments.user_id
        AND public.normalize_activity_color_key(task.value ->> 'name') = assignments.activity_key
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_activity_colors_after_delete () RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  affected_user UUID;
BEGIN
  FOR affected_user IN
    SELECT DISTINCT user_id FROM deleted_daily_logs
  LOOP
    PERFORM public.prune_unused_activity_colors(affected_user);
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_activity_colors_after_update () RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  affected_user UUID;
BEGIN
  FOR affected_user IN
    SELECT DISTINCT old_logs.user_id
    FROM old_daily_logs AS old_logs
    JOIN new_daily_logs AS new_logs USING (user_id, date)
    WHERE old_logs.custom_tasks IS DISTINCT FROM new_logs.custom_tasks
  LOOP
    PERFORM public.prune_unused_activity_colors(affected_user);
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_unused_activity_colors (UUID)
FROM
  PUBLIC;

REVOKE ALL ON FUNCTION public.cleanup_activity_colors_after_delete ()
FROM
  PUBLIC;

REVOKE ALL ON FUNCTION public.cleanup_activity_colors_after_update ()
FROM
  PUBLIC;

CREATE TRIGGER daily_logs_activity_colors_cleanup_delete
AFTER DELETE ON public.daily_logs REFERENCING OLD TABLE AS deleted_daily_logs FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_activity_colors_after_delete ();

CREATE TRIGGER daily_logs_activity_colors_cleanup_update
AFTER UPDATE ON public.daily_logs REFERENCING OLD TABLE AS old_daily_logs NEW TABLE AS new_daily_logs FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_activity_colors_after_update ();
