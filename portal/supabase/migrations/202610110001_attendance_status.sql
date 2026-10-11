alter table public.attendance
  add column if not exists attendance_status text not null default 'present';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass
      AND conname = 'attendance_attendance_status_check'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_attendance_status_check
      CHECK (attendance_status in ('present', 'absent', 'half_day'));
  END IF;
END $$;

notify pgrst, 'reload schema';
