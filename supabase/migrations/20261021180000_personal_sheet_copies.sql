ALTER TABLE public.user_sheets
ADD COLUMN IF NOT EXISTS builtin_template_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS user_sheets_user_builtin_template_idx ON public.user_sheets (user_id, builtin_template_id)
WHERE
  builtin_template_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_deleted_builtin_sheets (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  sheet_id TEXT NOT NULL CHECK (sheet_id ~ '^[a-z0-9_-]{1,80}$'),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, sheet_id)
);

ALTER TABLE public.user_deleted_builtin_sheets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.user_hidden_sheets') IS NOT NULL THEN
    EXECUTE $copy$
      INSERT INTO public.user_deleted_builtin_sheets (user_id, sheet_id)
      SELECT user_id, sheet_id
      FROM public.user_hidden_sheets
      ON CONFLICT (user_id, sheet_id) DO NOTHING
    $copy$;
    DROP TABLE public.user_hidden_sheets;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_sheet_progress_for_owner (
  target_user_id UUID,
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
  ),
  deleted_progress AS (
    DELETE FROM public.progress AS progress_row
    USING sheet_problem_ids
    WHERE progress_row.user_id = target_user_id
      AND progress_row.problem_id = sheet_problem_ids.problem_id
    RETURNING progress_row.state, progress_row.completed_on, progress_row.updated_at
  ),
  date_deltas AS (
    SELECT
      COALESCE(
        completed_on,
        (updated_at AT TIME ZONE 'UTC')::DATE
      ) AS activity_date,
      COUNT(*)::INTEGER AS completed_count
    FROM deleted_progress
    WHERE state = 'done'
    GROUP BY 1
  )
  UPDATE public.activity_log AS activity
  SET
    count = GREATEST(activity.count - date_deltas.completed_count, 0),
    updated_at = NOW()
  FROM date_deltas
  WHERE activity.user_id = target_user_id
    AND activity.date = date_deltas.activity_date;

  DELETE FROM public.activity_log
  WHERE user_id = target_user_id
    AND count = 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_builtin_sheet_copies (requested_sheets JSONB) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  requested_sheet JSONB;
  template_id TEXT;
  template_title TEXT;
  template_data JSONB;
  sheet_uuid UUID;
  existing_sheet_data JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to initialize sheets.';
  END IF;
  IF jsonb_typeof(requested_sheets) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'A list of built-in sheet templates is required.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::TEXT), 0);

  FOR requested_sheet IN
    SELECT value FROM jsonb_array_elements(requested_sheets)
  LOOP
    template_id := requested_sheet->>'id';
    template_title := requested_sheet->>'title';
    template_data := requested_sheet->'sheet_data';

    IF template_id IS NULL
      OR template_id !~ '^[a-z0-9_-]{1,80}$'
      OR template_title IS NULL
      OR char_length(template_title) NOT BETWEEN 1 AND 80
      OR jsonb_typeof(template_data) IS DISTINCT FROM 'object'
      OR jsonb_typeof(template_data->'steps') IS DISTINCT FROM 'array'
      OR pg_column_size(template_data) > 2097152
    THEN
      RAISE EXCEPTION 'A built-in sheet template is invalid.';
    END IF;

    SELECT sheets.id, sheets.sheet_data
    INTO sheet_uuid, existing_sheet_data
    FROM public.user_sheets AS sheets
    WHERE sheets.user_id = auth.uid()
      AND sheets.builtin_template_id = template_id;

    IF EXISTS (
      SELECT 1
      FROM public.user_deleted_builtin_sheets AS deleted
      WHERE deleted.user_id = auth.uid()
        AND deleted.sheet_id = template_id
    ) THEN
      PERFORM public.delete_sheet_progress_for_owner(
        auth.uid(),
        sheet_uuid,
        COALESCE(existing_sheet_data, template_data)
      );
      DELETE FROM public.user_sheets AS sheets
      WHERE sheets.user_id = auth.uid()
        AND sheets.builtin_template_id = template_id;
      CONTINUE;
    END IF;

    IF sheet_uuid IS NULL THEN
      INSERT INTO public.user_sheets (
        user_id,
        title,
        source_name,
        sheet_data,
        builtin_template_id
      )
      VALUES (
        auth.uid(),
        template_title,
        'builtin:' || template_id,
        template_data,
        template_id
      )
      ON CONFLICT (user_id, builtin_template_id)
        WHERE builtin_template_id IS NOT NULL
      DO NOTHING
      RETURNING id INTO sheet_uuid;

      IF sheet_uuid IS NULL THEN
        SELECT sheets.id INTO sheet_uuid
        FROM public.user_sheets AS sheets
        WHERE sheets.user_id = auth.uid()
          AND sheets.builtin_template_id = template_id;
      END IF;
    END IF;

  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_sheet (requested_sheet_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  removed_sheet_data JSONB;
  removed_template_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to remove a sheet.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::TEXT), 0);

  DELETE FROM public.user_sheets
  WHERE id = requested_sheet_id
    AND user_id = auth.uid()
  RETURNING sheet_data, builtin_template_id
  INTO removed_sheet_data, removed_template_id;

  IF removed_sheet_data IS NULL THEN
    RETURN FALSE;
  END IF;

  IF removed_template_id IS NOT NULL THEN
    INSERT INTO public.user_deleted_builtin_sheets (user_id, sheet_id)
    VALUES (auth.uid(), removed_template_id)
    ON CONFLICT (user_id, sheet_id) DO NOTHING;
  END IF;

  PERFORM public.delete_sheet_progress_for_owner(
    auth.uid(), requested_sheet_id, removed_sheet_data
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_sheet_progress_for_owner (UUID, UUID, JSONB)
FROM
  PUBLIC,
  anon,
  authenticated;

REVOKE ALL ON FUNCTION public.ensure_builtin_sheet_copies (JSONB)
FROM
  PUBLIC,
  anon;

GRANT
EXECUTE ON FUNCTION public.ensure_builtin_sheet_copies (JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_user_sheet (UUID)
FROM
  PUBLIC,
  anon;

GRANT
EXECUTE ON FUNCTION public.delete_user_sheet (UUID) TO authenticated;
