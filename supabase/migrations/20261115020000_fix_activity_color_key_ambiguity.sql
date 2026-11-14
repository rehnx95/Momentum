CREATE OR REPLACE FUNCTION public.assign_activity_color_for_user (p_user_id UUID, p_activity_name TEXT) RETURNS TEXT LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_activity_key TEXT := public.normalize_activity_color_key(p_activity_name);
  v_activity_color TEXT;
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
  INTO v_activity_color
  FROM public.activity_color_assignments AS assignments
  WHERE assignments.user_id = p_user_id
    AND assignments.activity_key = v_activity_key;

  IF FOUND THEN
    RETURN v_activity_color;
  END IF;

  v_activity_color := CASE v_activity_key
    WHEN 'dsa sheet' THEN 'sand'
    WHEN 'backend' THEN 'slate_blue'
    WHEN 'system design' THEN 'sky'
    WHEN 'project' THEN 'olive'
    WHEN 'reading' THEN 'rose'
    ELSE NULL
  END;

  IF v_activity_color IS NULL THEN
    SELECT colors.color
    INTO v_activity_color
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

  IF v_activity_color IS NULL THEN
    SELECT colors.color
    INTO v_activity_color
    FROM unnest(palette) WITH ORDINALITY AS colors (color, color_order)
    LEFT JOIN public.activity_color_assignments AS assignments
      ON assignments.user_id = p_user_id
      AND assignments.color = colors.color
    GROUP BY colors.color, colors.color_order
    ORDER BY COUNT(assignments.activity_key), colors.color_order
    LIMIT 1;
  END IF;

  INSERT INTO public.activity_color_assignments (user_id, activity_key, color)
  VALUES (p_user_id, v_activity_key, v_activity_color);

  RETURN v_activity_color;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_activity_color (p_activity_name TEXT, p_color TEXT) RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_activity_key TEXT := public.normalize_activity_color_key(p_activity_name);
  v_normalized_color TEXT := lower(COALESCE(p_color, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A signed-in user is required.';
  END IF;
  IF v_activity_key IN ('', 'sleep') THEN
    RAISE EXCEPTION 'This activity cannot be assigned a custom color.';
  END IF;
  IF v_normalized_color NOT IN (
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
  ) AND v_normalized_color !~ '^#[0-9a-f]{6}$' THEN
    RAISE EXCEPTION 'The requested activity color is invalid.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::TEXT), hashtext('activity-colors'));

  INSERT INTO public.activity_color_assignments (
    user_id,
    activity_key,
    color,
    updated_at
  )
  VALUES (auth.uid(), v_activity_key, v_normalized_color, NOW())
  ON CONFLICT ON CONSTRAINT activity_color_assignments_pkey
  DO UPDATE SET color = EXCLUDED.color, updated_at = NOW();
END;
$$;

NOTIFY pgrst,
'reload schema';
