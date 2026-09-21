alter table public.work_locations add column if not exists latitude double precision;
alter table public.work_locations add column if not exists longitude double precision;
alter table public.work_locations add column if not exists allowed_radius_meters integer not null default 150;
alter table public.work_locations add column if not exists client_id uuid references public.clients(id) on delete set null;

alter table public.work_locations drop constraint if exists work_locations_allowed_radius_meters_check;
alter table public.work_locations add constraint work_locations_allowed_radius_meters_check check (allowed_radius_meters between 25 and 5000);

notify pgrst, 'reload schema';
