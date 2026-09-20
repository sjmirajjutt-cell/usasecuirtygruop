do $$
begin
  create type public.password_reset_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  requested_by_name text not null,
  email text not null,
  reason text,
  status public.password_reset_status not null default 'pending',
  note text,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_requests_employee_idx on public.password_reset_requests(employee_id, created_at desc);
create index if not exists password_reset_requests_status_idx on public.password_reset_requests(status, created_at desc);

alter table public.password_reset_requests enable row level security;

drop policy if exists "employees can request password reset" on public.password_reset_requests;
create policy "employees can request password reset" on public.password_reset_requests
for insert to authenticated
with check (employee_id = auth.uid());

drop policy if exists "employees read own reset requests" on public.password_reset_requests;
create policy "employees read own reset requests" on public.password_reset_requests
for select to authenticated
using (employee_id = auth.uid() or public.is_admin());

drop policy if exists "admins manage reset requests" on public.password_reset_requests;
create policy "admins manage reset requests" on public.password_reset_requests
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'password_reset_requests'
  ) then
    alter publication supabase_realtime add table public.password_reset_requests;
  end if;
exception when undefined_object then null;
end $$;