# USA Security & Protection Group Portal

Next.js App Router portal for Vince Charles and field employees. Officers are managed through the unified Employees workspace.

## Local setup

1. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key. Keep the server-only values private.
2. Apply `supabase/migrations/202609180001_initial_schema.sql` in the Supabase SQL editor.
3. In Supabase Dashboard, open **Authentication > Users**, click **Add user**, and create the email/password account used to sign in. The migration automatically creates its officer profile. If the account already exists, rerun the migration SQL once so its profile is backfilled.
4. Rerun the migration SQL after this attendance update so the `attendance` table, employee fields, RLS policies, and Realtime publication are applied.
5. Promote the first account to an administrator by running this in the SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
```

Replace `admin@example.com` with the account's email address. Then install and start:

```powershell
npm.cmd install
npm.cmd run dev
```

The existing Bizzark source remains in `../Html`. Copy its compiled assets into `public/bizzark` when adapting more screens. This starter keeps the layout primitives in React and Tailwind so Bizzark markup can be migrated incrementally.

# usasecuirtygruop
