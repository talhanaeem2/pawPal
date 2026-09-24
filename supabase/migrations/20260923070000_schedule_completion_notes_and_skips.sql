-- A completion may be deliberately skipped for one day, and may carry a
-- short observation. Existing rows are completed reminders by default.
ALTER TABLE public.schedule_completions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('completed', 'skipped', 'pending')),
  ADD COLUMN IF NOT EXISTS note TEXT;

CREATE INDEX IF NOT EXISTS schedule_completions_today_status_idx
  ON public.schedule_completions (completed_on, status);
