update public.attendance as attendance
set is_paid = false
where not exists (
  select 1
  from public.payroll_payments as payment
  where payment.employee_id = attendance.employee_id
    and attendance.check_in::date between payment.period_start and payment.period_end
);

notify pgrst, 'reload schema';