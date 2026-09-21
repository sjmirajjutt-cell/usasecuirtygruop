create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address_line_1 text not null,
  address_line_2 text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.clients add column if not exists name text;
alter table public.clients add column if not exists address_line_1 text;
alter table public.clients add column if not exists address_line_2 text;
alter table public.clients add column if not exists phone text;
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists created_at timestamptz not null default now();

alter table public.clients enable row level security;

drop policy if exists "admins manage clients" on public.clients;
create policy "admins manage clients"
on public.clients
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';
