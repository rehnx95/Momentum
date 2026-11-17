CREATE OR REPLACE FUNCTION public.sync_builtin_sheet_problem_titles (requested_sheets JSONB) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  requested_sheet JSONB;
  template_id TEXT;
  template_data JSONB;
  canonical_titles JSONB;
  sheet_uuid UUID;
  existing_sheet JSONB;
  updated_sheet JSONB;
  step_index INTEGER;
  subsection_index INTEGER;
  problem_index INTEGER;
  problem_id TEXT;
  canonical_title JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to synchronize built-in sheets.';
  END IF;
  IF jsonb_typeof(requested_sheets) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'A list of built-in sheet templates is required.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::TEXT), 0);

  FOR requested_sheet IN
    SELECT value FROM jsonb_array_elements(requested_sheets)
  LOOP
    template_id := requested_sheet->>'id';
    template_data := requested_sheet->'sheet_data';

    IF template_id IS NULL
      OR template_id !~ '^[a-z0-9_-]{1,80}$'
      OR jsonb_typeof(template_data) IS DISTINCT FROM 'object'
      OR jsonb_typeof(template_data->'steps') IS DISTINCT FROM 'array'
      OR pg_column_size(template_data) > 2097152
    THEN
      RAISE EXCEPTION 'A built-in sheet template is invalid.';
    END IF;

    SELECT COALESCE(
      jsonb_object_agg(problem.value->>'id', problem.value->'title'),
      '{}'::JSONB
    )
    INTO canonical_titles
    FROM jsonb_array_elements(template_data->'steps') AS step(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(step.value->'subsections', '[]'::JSONB)
    ) AS subsection(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(subsection.value->'problems', '[]'::JSONB)
    ) AS problem(value)
    WHERE jsonb_typeof(problem.value->'id') = 'string'
      AND jsonb_typeof(problem.value->'title') = 'string';

    SELECT sheets.id, sheets.sheet_data
    INTO sheet_uuid, existing_sheet
    FROM public.user_sheets AS sheets
    WHERE sheets.user_id = auth.uid()
      AND sheets.builtin_template_id = template_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.user_deleted_builtin_sheets AS deleted
      WHERE deleted.user_id = auth.uid()
        AND deleted.sheet_id = template_id
    ) THEN
      CONTINUE;
    END IF;

    IF jsonb_typeof(existing_sheet->'steps') IS DISTINCT FROM 'array' THEN
      CONTINUE;
    END IF;

    updated_sheet := existing_sheet;
    FOR step_index IN 0 .. jsonb_array_length(updated_sheet->'steps') - 1
    LOOP
      IF jsonb_typeof(
        updated_sheet->'steps'->step_index->'subsections'
      ) IS DISTINCT FROM 'array' THEN
        CONTINUE;
      END IF;

      FOR subsection_index IN 0 .. jsonb_array_length(
        updated_sheet->'steps'->step_index->'subsections'
      ) - 1
      LOOP
        IF jsonb_typeof(
          updated_sheet->'steps'->step_index->'subsections'->subsection_index->'problems'
        ) IS DISTINCT FROM 'array' THEN
          CONTINUE;
        END IF;

        FOR problem_index IN 0 .. jsonb_array_length(
          updated_sheet->'steps'->step_index->'subsections'->subsection_index->'problems'
        ) - 1
        LOOP
          problem_id := updated_sheet->'steps'->step_index->'subsections'
            ->subsection_index->'problems'->problem_index->>'id';
          canonical_title := canonical_titles->problem_id;

          IF problem_id IS NOT NULL
            AND canonical_title IS NOT NULL
            AND updated_sheet->'steps'->step_index->'subsections'
              ->subsection_index->'problems'->problem_index->'title'
              IS DISTINCT FROM canonical_title
          THEN
            updated_sheet := jsonb_set(
              updated_sheet,
              ARRAY[
                'steps',
                step_index::TEXT,
                'subsections',
                subsection_index::TEXT,
                'problems',
                problem_index::TEXT,
                'title'
              ],
              canonical_title,
              TRUE
            );
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;

    UPDATE public.user_sheets AS sheets
    SET sheet_data = updated_sheet
    WHERE sheets.id = sheet_uuid
      AND sheets.user_id = auth.uid()
      AND sheets.builtin_template_id = template_id
      AND sheets.sheet_data IS DISTINCT FROM updated_sheet;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_builtin_sheet_problem_titles (JSONB)
FROM
  PUBLIC,
  anon;

GRANT
EXECUTE ON FUNCTION public.sync_builtin_sheet_problem_titles (JSONB) TO authenticated;
