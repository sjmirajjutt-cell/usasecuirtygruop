alter table public.attendance add column if not exists paid_at timestamptz;

update public.attendance as attendance
set paid_at = coalesce(attendance.paid_at, (
  select max(payment.paid_at)
  from public.payroll_payments as payment
  where payment.employee_id = attendance.employee_id
)), is_paid = false
where attendance.check_out is null;

update public.attendance as attendance
set is_paid = false
where not exists (
  select 1
  from public.payroll_payments as payment
  where payment.employee_id = attendance.employee_id
    and attendance.check_in::date between payment.period_start and payment.period_end
);

notify pgrst, 'reload schema';