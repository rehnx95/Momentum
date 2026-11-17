CREATE OR REPLACE FUNCTION public.restore_builtin_dsa_sheet (requested_sheet JSONB) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  template_id TEXT;
  template_title TEXT;
  template_data JSONB;
  sheet_uuid UUID;
  existing_sheet_data JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to restore the DSA sheet.';
  END IF;
  IF jsonb_typeof(requested_sheet) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'A DSA sheet template is required.';
  END IF;

  template_id := requested_sheet->>'id';
  template_title := requested_sheet->>'title';
  template_data := requested_sheet->'sheet_data';

  IF template_id IS DISTINCT FROM 'dsa'
    OR template_title IS DISTINCT FROM 'DSA'
    OR jsonb_typeof(template_data) IS DISTINCT FROM 'object'
    OR jsonb_typeof(template_data->'steps') IS DISTINCT FROM 'array'
    OR pg_column_size(template_data) > 2097152
  THEN
    RAISE EXCEPTION 'The DSA sheet template is invalid.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::TEXT), 0);

  SELECT sheets.id, sheets.sheet_data
  INTO sheet_uuid, existing_sheet_data
  FROM public.user_sheets AS sheets
  WHERE sheets.user_id = auth.uid()
    AND sheets.builtin_template_id = 'dsa'
  FOR UPDATE;

  IF sheet_uuid IS NOT NULL THEN
    PERFORM public.delete_sheet_progress_for_owner(
      auth.uid(),
      'dsa',
      sheet_uuid,
      existing_sheet_data
    );

    UPDATE public.user_sheets AS sheets
    SET
      title = template_title,
      source_name = 'builtin:dsa',
      sheet_data = template_data
    WHERE sheets.id = sheet_uuid
      AND sheets.user_id = auth.uid();
  ELSE
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
      'builtin:dsa',
      template_data,
      'dsa'
    )
    RETURNING id INTO sheet_uuid;
  END IF;

  PERFORM public.delete_sheet_progress_for_owner(
    auth.uid(),
    'dsa',
    sheet_uuid,
    template_data
  );

  DELETE FROM public.user_deleted_builtin_sheets AS deleted
  WHERE deleted.user_id = auth.uid()
    AND deleted.sheet_id = 'dsa';

  RETURN jsonb_build_object(
    'id', sheet_uuid,
    'title', template_title,
    'source_name', 'builtin:dsa',
    'builtin_template_id', 'dsa',
    'sheet_data', template_data
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_builtin_dsa_sheet (JSONB)
FROM
  PUBLIC,
  anon;

GRANT
EXECUTE ON FUNCTION public.restore_builtin_dsa_sheet (JSONB) TO authenticated;
