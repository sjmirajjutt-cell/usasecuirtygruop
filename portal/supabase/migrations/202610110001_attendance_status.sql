alter table public.attendance
  add column if not exists attendance_status text not null default 'present'
  check (attendance_status in ('present', 'absent', 'half_day'));

notify pgrst, 'reload schema';
