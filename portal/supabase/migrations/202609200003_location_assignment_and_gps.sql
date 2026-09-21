alter table public.work_locations add column if not exists latitude double precision;
alter table public.work_locations add column if not exists longitude double precision;
alter table public.work_locations add column if not exists allowed_radius_meters integer not null default 150;
alter table public.work_locations add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.profiles add column if not exists assigned_location_id uuid references public.work_locations(id) on delete set null;
alter table public.attendance add column if not exists assigned_location_id uuid references public.work_locations(id) on delete set null;
alter table public.attendance add column if not exists check_in_latitude double precision;
alter table public.attendance add column if not exists check_in_longitude double precision;
alter table public.attendance add column if not exists check_in_accuracy_meters double precision;
alter table public.attendance add column if not exists distance_from_location_meters double precision;
alter table public.attendance add column if not exists location_status text not null default 'not_verified';

alter table public.work_locations drop constraint if exists work_locations_allowed_radius_meters_check;
alter table public.work_locations add constraint work_locations_allowed_radius_meters_check check (allowed_radius_meters between 25 and 5000);
alter table public.attendance drop constraint if exists attendance_location_status_check;
alter table public.attendance add constraint attendance_location_status_check check (location_status in ('matched', 'outside_radius', 'not_verified'));