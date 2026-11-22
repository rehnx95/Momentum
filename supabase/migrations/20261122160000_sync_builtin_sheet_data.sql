CREATE OR REPLACE FUNCTION public.sync_builtin_sheet_data (requested_sheets JSONB) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  requested_sheet JSONB;
  template_id TEXT;
  template_title TEXT;
  template_data JSONB;
  sheet_uuid UUID;
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

    SELECT sheets.id
    INTO sheet_uuid
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

    UPDATE public.user_sheets AS sheets
    SET title = template_title,
        sheet_data = template_data
    WHERE sheets.id = sheet_uuid
      AND sheets.user_id = auth.uid()
      AND sheets.builtin_template_id = template_id
      AND (
        sheets.title IS DISTINCT FROM template_title
        OR sheets.sheet_data IS DISTINCT FROM template_data
      );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_builtin_sheet_data (JSONB)
FROM
  PUBLIC,
  anon;

GRANT EXECUTE ON FUNCTION public.sync_builtin_sheet_data (JSONB) TO authenticated;
