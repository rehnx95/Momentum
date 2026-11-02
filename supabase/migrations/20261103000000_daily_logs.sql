CREATE TABLE IF NOT EXISTS public.daily_logs (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_time TIME,
  wake_time TIME,
  dsa_start TIME,
  dsa_end TIME,
  dsa_hours NUMERIC(5,2),
  backend_start TIME,
  backend_end TIME,
  backend_hours NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, date),
  CONSTRAINT daily_logs_dsa_hours_check CHECK (dsa_hours IS NULL OR (dsa_hours >= 0 AND dsa_hours <= 24)),
  CONSTRAINT daily_logs_backend_hours_check CHECK (backend_hours IS NULL OR (backend_hours >= 0 AND backend_hours <= 24)),
  CONSTRAINT daily_logs_height_check CHECK (height_cm IS NULL OR (height_cm >= 0 AND height_cm <= 300))
);

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS custom_tasks JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS dsa_slots JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS backend_slots JSONB NOT NULL DEFAULT '[]'::JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_logs'
      AND column_name = 'dsa_start'
  ) THEN
    UPDATE public.daily_logs
    SET dsa_slots = CASE
      WHEN dsa_start IS NOT NULL OR dsa_end IS NOT NULL
        THEN jsonb_build_array(jsonb_build_object(
          'start', COALESCE(to_char(dsa_start, 'HH24:MI'), ''),
          'end', COALESCE(to_char(dsa_end, 'HH24:MI'), '')
        ))
      ELSE '[]'::JSONB
    END
    WHERE dsa_slots = '[]'::JSONB;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_logs'
      AND column_name = 'backend_start'
  ) THEN
    UPDATE public.daily_logs
    SET backend_slots = CASE
      WHEN backend_start IS NOT NULL OR backend_end IS NOT NULL
        THEN jsonb_build_array(jsonb_build_object(
          'start', COALESCE(to_char(backend_start, 'HH24:MI'), ''),
          'end', COALESCE(to_char(backend_end, 'HH24:MI'), '')
        ))
      ELSE '[]'::JSONB
    END
    WHERE backend_slots = '[]'::JSONB;
  END IF;
END
$$;

ALTER TABLE public.daily_logs
  DROP COLUMN IF EXISTS height_cm,
  DROP COLUMN IF EXISTS dsa_start,
  DROP COLUMN IF EXISTS dsa_end,
  DROP COLUMN IF EXISTS backend_start,
  DROP COLUMN IF EXISTS backend_end;

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_logs_access_own ON public.daily_logs;
CREATE POLICY daily_logs_access_own ON public.daily_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS daily_logs_user_date_idx
  ON public.daily_logs(user_id, date DESC);
