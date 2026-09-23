alter table public.attendance add column if not exists is_paid boolean not null default false;

create index if not exists attendance_employee_paid_date_idx on public.attendance(employee_id, is_paid, check_in desc);

notify pgrst, 'reload schema';