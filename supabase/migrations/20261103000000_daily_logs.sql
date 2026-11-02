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

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_logs_access_own ON public.daily_logs;
CREATE POLICY daily_logs_access_own ON public.daily_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS daily_logs_user_date_idx
  ON public.daily_logs(user_id, date DESC);
