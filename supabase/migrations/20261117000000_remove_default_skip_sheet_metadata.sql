CREATE OR REPLACE FUNCTION public.strip_legacy_default_skip (input_json JSONB) RETURNS JSONB LANGUAGE plpgsql IMMUTABLE
SET
  search_path = pg_catalog,
  public AS $$
DECLARE
  result JSONB;
BEGIN
  IF JSONB_TYPEOF(input_json) = 'object' THEN
    SELECT COALESCE(
      JSONB_OBJECT_AGG(entry.key, public.strip_legacy_default_skip(entry.value)),
      '{}'::JSONB
    )
    INTO result
    FROM JSONB_EACH(input_json) AS entry
    WHERE entry.key <> 'defaultSkip';

    RETURN result;
  END IF;

  IF JSONB_TYPEOF(input_json) = 'array' THEN
    SELECT COALESCE(
      JSONB_AGG(public.strip_legacy_default_skip(entry.value) ORDER BY entry.ordinality),
      '[]'::JSONB
    )
    INTO result
    FROM JSONB_ARRAY_ELEMENTS(input_json) WITH ORDINALITY AS entry(value, ordinality);

    RETURN result;
  END IF;

  RETURN input_json;
END;
$$;

UPDATE public.user_sheets
SET
  sheet_data = public.strip_legacy_default_skip(sheet_data)
WHERE
  sheet_data::TEXT LIKE '%"defaultSkip"%';

DROP FUNCTION public.strip_legacy_default_skip (JSONB);
