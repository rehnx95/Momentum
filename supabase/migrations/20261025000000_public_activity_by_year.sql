CREATE OR REPLACE FUNCTION public.get_public_activity (
  requested_username TEXT,
  requested_today DATE,
  requested_year INTEGER DEFAULT NULL
) RETURNS TABLE (activity JSONB, active_years INTEGER[]) LANGUAGE SQL STABLE SECURITY DEFINER
SET
  search_path = public AS $$
WITH target AS (
  SELECT p.id
  FROM public.profiles AS p
  WHERE auth.uid() IS NOT NULL
    AND p.onboarding_completed
    AND LOWER(p.username) = LOWER(BTRIM(requested_username))
  LIMIT 1
),
solved AS (
  SELECT COALESCE(pr.completed_on, (pr.updated_at AT TIME ZONE 'UTC')::DATE) AS date
  FROM public.progress AS pr
  JOIN target AS t ON t.id = pr.user_id
  WHERE pr.state = 'done'
),
bounds AS (
  SELECT
    CASE WHEN requested_year BETWEEN 2000 AND 2100
         THEN make_date(requested_year, 1, 1)
         ELSE requested_today - 371 END AS start_date,
    CASE WHEN requested_year BETWEEN 2000 AND 2100
         THEN LEAST(make_date(requested_year, 12, 31), requested_today)
         ELSE requested_today END AS end_date
)
SELECT
  COALESCE((
    SELECT jsonb_object_agg(daily.date::TEXT, daily.count)
    FROM (
      SELECT s.date, COUNT(*)::INTEGER AS count
      FROM solved AS s CROSS JOIN bounds AS b
      WHERE s.date BETWEEN b.start_date AND b.end_date
      GROUP BY s.date
    ) AS daily
  ), '{}'::JSONB) AS activity,
  COALESCE((
    SELECT ARRAY_AGG(y.yr ORDER BY y.yr DESC)
    FROM (
      SELECT DISTINCT EXTRACT(YEAR FROM s.date)::INTEGER AS yr FROM solved AS s
    ) AS y
  ), ARRAY[]::INTEGER[]) AS active_years;
$$;

REVOKE ALL ON FUNCTION public.get_public_activity (TEXT, DATE, INTEGER)
FROM
  PUBLIC,
  anon;

GRANT
EXECUTE ON FUNCTION public.get_public_activity (TEXT, DATE, INTEGER) TO authenticated;
