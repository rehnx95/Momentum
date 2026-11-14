CREATE TABLE IF NOT EXISTS public.activity_color_assignments (
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  activity_key TEXT NOT NULL,
  color TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, activity_key),
  CONSTRAINT activity_color_assignments_color_check CHECK (
    color IN (
      'sand',
      'slate_blue',
      'sky',
      'olive',
      'rose',
      'dusty_red',
      'teal',
      'lavender',
      'mint',
      'deep_teal',
      'peach',
      'salmon',
      'steel_blue',
      'bronze',
      'sage'
    )
    OR color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

ALTER TABLE public.activity_color_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_color_assignments_access_own ON public.activity_color_assignments;

CREATE POLICY activity_color_assignments_access_own ON public.activity_color_assignments FOR ALL TO authenticated USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);

CREATE OR REPLACE FUNCTION public.normalize_activity_color_key (p_activity_name TEXT) RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN lower(regexp_replace(trim(COALESCE(p_activity_name, '')), '\s+', ' ', 'g')) = 'dsa'
      THEN 'dsa sheet'
    ELSE lower(regexp_replace(trim(COALESCE(p_activity_name, '')), '\s+', ' ', 'g'))
  END;
$$;

DO $$
DECLARE
  activity_row RECORD;
  activity_color TEXT;
  palette TEXT[] := ARRAY[
    'sand',
    'slate_blue',
    'sky',
    'olive',
    'rose',
    'dusty_red',
    'teal',
    'lavender',
    'mint',
    'deep_teal',
    'peach',
    'salmon',
    'steel_blue',
    'bronze',
    'sage'
  ];
BEGIN
  FOR activity_row IN
    SELECT
      logs.user_id,
      public.normalize_activity_color_key(task.value ->> 'name') AS activity_key,
      MIN(logs.date) AS first_date
    FROM public.daily_logs AS logs
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(logs.custom_tasks) = 'array' THEN logs.custom_tasks
        ELSE '[]'::JSONB
      END
    ) AS task (value)
    GROUP BY logs.user_id, public.normalize_activity_color_key(task.value ->> 'name')
    HAVING public.normalize_activity_color_key(task.value ->> 'name') NOT IN ('', 'sleep')
    ORDER BY logs.user_id, MIN(logs.date), activity_key
  LOOP
    activity_color := CASE activity_row.activity_key
      WHEN 'dsa sheet' THEN 'sand'
      WHEN 'backend' THEN 'slate_blue'
      WHEN 'system design' THEN 'sky'
      WHEN 'project' THEN 'olive'
      WHEN 'reading' THEN 'rose'
      ELSE NULL
    END;

    IF activity_color IS NOT NULL THEN
      INSERT INTO public.activity_color_assignments (user_id, activity_key, color)
      VALUES (activity_row.user_id, activity_row.activity_key, activity_color)
      ON CONFLICT (user_id, activity_key) DO NOTHING;
    END IF;
  END LOOP;

  FOR activity_row IN
    SELECT
      activity_names.user_id,
      activity_names.activity_key,
      ROW_NUMBER() OVER (
        PARTITION BY activity_names.user_id
        ORDER BY activity_names.first_date, activity_names.activity_key
      ) AS activity_number
    FROM (
      SELECT
        logs.user_id,
        public.normalize_activity_color_key(task.value ->> 'name') AS activity_key,
        MIN(logs.date) AS first_date
      FROM public.daily_logs AS logs
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(logs.custom_tasks) = 'array' THEN logs.custom_tasks
          ELSE '[]'::JSONB
        END
      ) AS task (value)
      GROUP BY logs.user_id, public.normalize_activity_color_key(task.value ->> 'name')
      HAVING public.normalize_activity_color_key(task.value ->> 'name') NOT IN (
        '',
        'sleep',
        'dsa sheet',
        'backend',
        'system design',
        'project',
        'reading'
      )
    ) AS activity_names
    ORDER BY activity_names.user_id, activity_names.first_date, activity_names.activity_key
  LOOP
    IF activity_row.activity_number <= 10 THEN
      activity_color := palette[(5 + activity_row.activity_number)::INTEGER];
    ELSE
      activity_color := palette[
        (((activity_row.activity_number - 11) % ARRAY_LENGTH(palette, 1)) + 1)::INTEGER
      ];
    END IF;

    INSERT INTO public.activity_color_assignments (user_id, activity_key, color)
    VALUES (activity_row.user_id, activity_row.activity_key, activity_color)
    ON CONFLICT (user_id, activity_key) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_activity_color_for_user (p_user_id UUID, p_activity_name TEXT) RETURNS TEXT LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  activity_key TEXT := public.normalize_activity_color_key(p_activity_name);
  activity_color TEXT;
  palette TEXT[] := ARRAY[
    'sand',
    'slate_blue',
    'sky',
    'olive',
    'rose',
    'dusty_red',
    'teal',
    'lavender',
    'mint',
    'deep_teal',
    'peach',
    'salmon',
    'steel_blue',
    'bronze',
    'sage'
  ];
BEGIN
  IF p_user_id IS NULL OR activity_key IN ('', 'sleep') THEN
    IF activity_key = 'sleep' THEN
      RETURN 'sleep';
    END IF;
    RAISE EXCEPTION 'An activity name and signed-in user are required.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::TEXT), hashtext('activity-colors'));

  SELECT assignments.color
  INTO activity_color
  FROM public.activity_color_assignments AS assignments
  WHERE assignments.user_id = p_user_id
    AND assignments.activity_key = activity_key;

  IF FOUND THEN
    RETURN activity_color;
  END IF;

  activity_color := CASE activity_key
    WHEN 'dsa sheet' THEN 'sand'
    WHEN 'backend' THEN 'slate_blue'
    WHEN 'system design' THEN 'sky'
    WHEN 'project' THEN 'olive'
    WHEN 'reading' THEN 'rose'
    ELSE NULL
  END;

  IF activity_color IS NULL THEN
    SELECT colors.color
    INTO activity_color
    FROM unnest(palette) WITH ORDINALITY AS colors (color, color_order)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.activity_color_assignments AS assignments
      WHERE assignments.user_id = p_user_id
        AND assignments.color = colors.color
    )
      AND NOT EXISTS (
        SELECT 1
        FROM (
          VALUES
            ('dsa sheet', 'sand'),
            ('backend', 'slate_blue'),
            ('system design', 'sky'),
            ('project', 'olive'),
            ('reading', 'rose')
        ) AS fixed_activities (activity_key, color)
        WHERE fixed_activities.color = colors.color
          AND NOT EXISTS (
            SELECT 1
            FROM public.activity_color_assignments AS assignments
            WHERE assignments.user_id = p_user_id
              AND assignments.activity_key = fixed_activities.activity_key
          )
      )
    ORDER BY colors.color_order
    LIMIT 1;
  END IF;

  IF activity_color IS NULL THEN
    SELECT colors.color
    INTO activity_color
    FROM unnest(palette) WITH ORDINALITY AS colors (color, color_order)
    LEFT JOIN public.activity_color_assignments AS assignments
      ON assignments.user_id = p_user_id
      AND assignments.color = colors.color
    GROUP BY colors.color, colors.color_order
    ORDER BY COUNT(assignments.activity_key), colors.color_order
    LIMIT 1;
  END IF;

  INSERT INTO public.activity_color_assignments (user_id, activity_key, color)
  VALUES (p_user_id, activity_key, activity_color);

  RETURN activity_color;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_assign_activity_color (p_activity_name TEXT) RETURNS TEXT LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A signed-in user is required.';
  END IF;

  RETURN public.assign_activity_color_for_user(auth.uid(), p_activity_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_activity_color (p_activity_name TEXT, p_color TEXT) RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  activity_key TEXT := public.normalize_activity_color_key(p_activity_name);
  normalized_color TEXT := lower(COALESCE(p_color, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A signed-in user is required.';
  END IF;
  IF activity_key IN ('', 'sleep') THEN
    RAISE EXCEPTION 'This activity cannot be assigned a custom color.';
  END IF;
  IF normalized_color NOT IN (
    'sand',
    'slate_blue',
    'sky',
    'olive',
    'rose',
    'dusty_red',
    'teal',
    'lavender',
    'mint',
    'deep_teal',
    'peach',
    'salmon',
    'steel_blue',
    'bronze',
    'sage'
  ) AND normalized_color !~ '^#[0-9a-f]{6}$' THEN
    RAISE EXCEPTION 'The requested activity color is invalid.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::TEXT), hashtext('activity-colors'));

  INSERT INTO public.activity_color_assignments (user_id, activity_key, color, updated_at)
  VALUES (auth.uid(), activity_key, normalized_color, NOW())
  ON CONFLICT (user_id, activity_key)
  DO UPDATE SET color = EXCLUDED.color, updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_daily_log_activity_colors () RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  task JSONB;
  activity_key TEXT;
BEGIN
  FOR task IN
    SELECT value
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(NEW.custom_tasks) = 'array' THEN NEW.custom_tasks
        ELSE '[]'::JSONB
      END
    ) AS tasks (value)
  LOOP
    activity_key := public.normalize_activity_color_key(task ->> 'name');
    IF activity_key NOT IN ('', 'sleep') THEN
      PERFORM public.assign_activity_color_for_user(NEW.user_id, task ->> 'name');
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_unused_activity_colors () RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  affected_user UUID;
BEGIN
  affected_user := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  PERFORM pg_advisory_xact_lock(hashtext(affected_user::TEXT), hashtext('activity-colors'));

  DELETE FROM public.activity_color_assignments AS assignments
  WHERE assignments.user_id = affected_user
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

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_activity_color_for_user (UUID, TEXT)
FROM
  PUBLIC;

REVOKE ALL ON FUNCTION public.assign_daily_log_activity_colors ()
FROM
  PUBLIC;

REVOKE ALL ON FUNCTION public.cleanup_unused_activity_colors ()
FROM
  PUBLIC;

REVOKE ALL ON FUNCTION public.get_or_assign_activity_color (TEXT)
FROM
  PUBLIC;

REVOKE ALL ON FUNCTION public.set_activity_color (TEXT, TEXT)
FROM
  PUBLIC;

GRANT
EXECUTE ON FUNCTION public.get_or_assign_activity_color (TEXT) TO authenticated;

GRANT
EXECUTE ON FUNCTION public.set_activity_color (TEXT, TEXT) TO authenticated;

DROP TRIGGER IF EXISTS daily_logs_activity_colors_assign ON public.daily_logs;

CREATE TRIGGER daily_logs_activity_colors_assign
AFTER INSERT OR UPDATE OF custom_tasks ON public.daily_logs FOR EACH ROW
EXECUTE FUNCTION public.assign_daily_log_activity_colors ();

DROP TRIGGER IF EXISTS daily_logs_activity_colors_cleanup ON public.daily_logs;

CREATE TRIGGER daily_logs_activity_colors_cleanup
AFTER DELETE OR UPDATE OF custom_tasks ON public.daily_logs FOR EACH ROW
EXECUTE FUNCTION public.cleanup_unused_activity_colors ();
