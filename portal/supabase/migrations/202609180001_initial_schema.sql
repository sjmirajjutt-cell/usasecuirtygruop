create extension if not exists "pgcrypto";

do $$ begin
  create type public.profile_role as enum ('admin', 'officer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.invoice_status as enum ('pending', 'paid');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.profile_role not null default 'officer',
  pin_code text unique,
  employee_id text unique,
  phone text,
  address text,
  hourly_rate numeric(10,2) not null default 0 check (hourly_rate >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists employee_id text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists hourly_rate numeric(10,2) not null default 0;
alter table public.profiles add column if not exists is_active boolean not null default true;
create unique index if not exists profiles_employee_id_idx on public.profiles(employee_id) where employee_id is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email, 'Officer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, full_name)
select id, coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), email, 'Officer')
from auth.users
on conflict (id) do nothing;

create table if not exists public.work_locations (
  id uuid primary key default gen_random_uuid(),
  location_name text not null,
  address text not null,
  client_name text not null,
  latitude double precision,
  longitude double precision,
  allowed_radius_meters integer not null default 150 check (allowed_radius_meters between 25 and 5000),
  created_at timestamptz not null default now()
);

alter table public.work_locations add column if not exists latitude double precision;
alter table public.work_locations add column if not exists longitude double precision;
alter table public.work_locations add column if not exists allowed_radius_meters integer not null default 150;
alter table public.profiles add column if not exists assigned_location_id uuid references public.work_locations(id) on delete set null;

create table if not exists public.worksheets (
  id uuid primary key default gen_random_uuid(),
  officer_id uuid not null references public.profiles(id) on delete restrict,
  location_id uuid not null references public.work_locations(id) on delete restrict,
  date date not null,
  shift_hours text not null,
  total_hours numeric(6,2) not null check (total_hours > 0),
  hourly_rate numeric(10,2) not null check (hourly_rate >= 0),
  total_amount numeric(12,2) generated always as (total_hours * hourly_rate) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  amount_due numeric(12,2) not null check (amount_due >= 0),
  status public.invoice_status not null default 'pending',
  bank_details text not null default 'Bank of Punjab',
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address_line_1 text not null,
  address_line_2 text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.invoices add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.invoices add column if not exists invoice_number text;
alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists payment_terms text;
alter table public.invoices add column if not exists service_dates text;
alter table public.invoices add column if not exists line_items jsonb not null default '[]'::jsonb;
alter table public.invoices add column if not exists sales_tax numeric(12,2) not null default 0;
alter table public.work_locations add column if not exists client_id uuid references public.clients(id) on delete set null;

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  total_hours numeric(8,2) generated always as (
    case when check_out is null then null
    else extract(epoch from (check_out - check_in)) / 3600
    end
  ) stored,
  assigned_location_id uuid references public.work_locations(id) on delete set null,
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_in_accuracy_meters double precision,
  distance_from_location_meters double precision,
  location_status text not null default 'not_verified' check (location_status in ('matched', 'outside_radius', 'not_verified')),
  notes text,
  created_at timestamptz not null default now(),
  constraint attendance_valid_times check (check_out is null or check_out >= check_in)
);

create index if not exists worksheets_officer_date_idx on public.worksheets(officer_id, date desc);
create index if not exists worksheets_location_date_idx on public.worksheets(location_id, date desc);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists attendance_employee_date_idx on public.attendance(employee_id, check_in desc);
create unique index if not exists attendance_one_open_shift_idx on public.attendance(employee_id) where check_out is null;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

alter table public.profiles enable row level security;
alter table public.work_locations enable row level security;
alter table public.worksheets enable row level security;
alter table public.invoices enable row level security;
alter table public.clients enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "profiles self or admin read" on public.profiles;
create policy "profiles self or admin read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated read locations" on public.work_locations;
create policy "authenticated read locations" on public.work_locations for select to authenticated using (true);
drop policy if exists "admins manage locations" on public.work_locations;
create policy "admins manage locations" on public.work_locations for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "officers read own worksheets" on public.worksheets;
create policy "officers read own worksheets" on public.worksheets for select to authenticated using (officer_id = auth.uid() or public.is_admin());
drop policy if exists "admins manage worksheets" on public.worksheets;
create policy "admins manage worksheets" on public.worksheets for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage invoices" on public.invoices;
create policy "admins manage invoices" on public.invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage clients" on public.clients;
create policy "admins manage clients" on public.clients for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "employees read own attendance" on public.attendance;
create policy "employees read own attendance" on public.attendance for select to authenticated using (employee_id = auth.uid() or public.is_admin());
drop policy if exists "employees check attendance" on public.attendance;
create policy "employees check attendance" on public.attendance for insert to authenticated with check (employee_id = auth.uid());
drop policy if exists "employees close own attendance" on public.attendance;
create policy "employees close own attendance" on public.attendance for update to authenticated using (employee_id = auth.uid() or public.is_admin()) with check (employee_id = auth.uid() or public.is_admin());
drop policy if exists "admins manage attendance" on public.attendance;
create policy "admins manage attendance" on public.attendance for delete to authenticated using (public.is_admin());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance') then
    alter publication supabase_realtime add table public.attendance;
  end if;
exception when undefined_object then null;
end $$;
