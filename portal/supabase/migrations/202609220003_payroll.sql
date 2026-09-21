create table if not exists public.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  total_hours numeric(10,2) not null default 0,
  gross_amount numeric(12,2) not null default 0,
  status text not null default 'paid' check (status in ('paid')),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint payroll_period_valid check (period_end >= period_start),
  unique (employee_id, period_start, period_end)
);

alter table public.payroll_payments enable row level security;
drop policy if exists "admins manage payroll" on public.payroll_payments;
create policy "admins manage payroll" on public.payroll_payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "employees read own payroll" on public.payroll_payments;
create policy "employees read own payroll" on public.payroll_payments for select to authenticated using (employee_id = auth.uid() or public.is_admin());
create index if not exists payroll_employee_period_idx on public.payroll_payments(employee_id, period_start desc);
notify pgrst, 'reload schema';
