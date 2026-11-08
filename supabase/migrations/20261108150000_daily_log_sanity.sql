ALTER TABLE public.daily_logs
  ADD CONSTRAINT daily_logs_study_total_check
  CHECK (COALESCE(dsa_hours, 0) + COALESCE(backend_hours, 0) <= 24)
  NOT VALID;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS daily_log_visible;
