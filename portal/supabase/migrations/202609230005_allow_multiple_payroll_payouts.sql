    alter table public.payroll_payments
    drop constraint if exists payroll_payments_employee_id_period_start_period_end_key;

    notify pgrst, 'reload schema';