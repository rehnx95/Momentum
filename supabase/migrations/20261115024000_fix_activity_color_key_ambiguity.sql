CREATE OR REPLACE FUNCTION public.assign_activity_color_for_user (p_user_id UUID, p_activity_name TEXT) RETURNS TEXT LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_activity_key TEXT := public.normalize_activity_color_key(p_activity_name);
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
  IF p_user_id IS NULL OR v_activity_key IN ('', 'sleep') THEN
    IF v_activity_key = 'sleep' THEN
      RETURN 'sleep';
    END IF;
    RAISE EXCEPTION 'An activity name and signed-in user are required.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::TEXT), hashtext('activity-colors'));

  SELECT assignments.color
  INTO activity_color
  FROM public.activity_color_assignments AS assignments
  WHERE assignments.user_id = p_user_id
    AND assignments.activity_key = v_activity_key;

  IF FOUND THEN
    RETURN activity_color;
  END IF;

  activity_color := CASE v_activity_key
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
  VALUES (p_user_id, v_activity_key, activity_color);

  RETURN activity_color;
END;
$$;
