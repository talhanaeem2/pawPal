-- Invoke the reminder worker every five minutes. The function uses a
-- ten-minute catch-up window and notification_log to absorb normal scheduler
-- jitter without sending duplicates.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  reminder_job_id BIGINT;
  reminder_command TEXT := $command$
    SELECT net.http_post(
      url := 'https://zwsswalvglwvndursxoe.supabase.co/functions/v1/send-reminders',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $command$;
BEGIN
  SELECT jobid
  INTO reminder_job_id
  FROM cron.job
  WHERE jobname = 'pawpal-send-reminders';

  IF reminder_job_id IS NULL THEN
    PERFORM cron.schedule(
      'pawpal-send-reminders',
      '*/5 * * * *',
      reminder_command
    );
  ELSE
    PERFORM cron.alter_job(
      reminder_job_id,
      schedule := '*/5 * * * *',
      command := reminder_command,
      active := true
    );
  END IF;
END
$$;
