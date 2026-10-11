alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  alter column id set default gen_random_uuid();

delete from auth.users as auth_user
using public.profiles as employee
where employee.id = auth_user.id
  and employee.role = 'officer';
