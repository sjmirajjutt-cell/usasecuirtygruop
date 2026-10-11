alter table public.payroll_payments
  drop constraint if exists payroll_payments_status_check;

alter table public.payroll_payments
  add constraint payroll_payments_status_check check (status in ('paid', 'unpaid'));
