# Batchfund

A shared university-batch fund tracker for monthly LKR 500 contributions, event collections, members, and expenses. The app is designed for Vercel; Supabase provides shared authentication and storage.

## Local development

1. Install Node.js 20.19+ or 22.12+.
2. Copy `.env.example` to `.env.local`.
3. Configure the Supabase project details described below.
4. Run `npm install`, then `npm run dev`.

Without Supabase environment variables, the app displays a setup screen instead of saving records locally or showing misleading sample data.

## Supabase setup

1. Create a Supabase project.
2. In **SQL Editor**, run [`supabase/schema.sql`](./supabase/schema.sql).
   If you already have a project, run the schema again to make existing pending accounts viewers and give any auth accounts without profiles a viewer profile. Existing admins and viewers keep their roles.
3. In **Project Settings → API**, copy the Project URL and the publishable key into `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. Start the app and create your first account. After confirming the email, promote that account to admin in Supabase **SQL Editor**:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'your-email@example.com';
   ```

New email-confirmed accounts automatically receive viewer access to the fund overview and do not need a registration number or administrator approval. Admins can access member details, contributions, transactions, approvals, and manage fund records. The first admin must be promoted with the SQL above before adding the member directory. The sign-in screen also has a password-reset flow for existing email accounts.

Enable email confirmation under **Supabase → Authentication → Providers**. In **Authentication → URL Configuration**, set the production app URL as the Site URL and allow that URL in Redirect URLs; the app sends confirmation and password-reset links back to its current origin.

The app must be publicly reachable without a Vercel account. In **Vercel → Project Settings → Deployment Protection**, disable protection for the production deployment (or use an unprotected production domain). Vercel deployment protection runs before the app and cannot be bypassed by the app's sign-in code; Supabase email links to a protected deployment will show Vercel's login page.

### If sign-up says “Failed to fetch”

This means the browser could not reach the Supabase Auth endpoint; it is not an invalid-password response. Check that:

- `VITE_SUPABASE_URL` is the Project URL from the same Supabase project as `VITE_SUPABASE_PUBLISHABLE_KEY`. The URL should look like `https://<project-ref>.supabase.co`.
- The Supabase project is active and your browser can reach it.
- After editing local `.env.local`, stop and restart `npm run dev`. After editing Vercel environment variables, redeploy the app.
- The browser's Network panel shows the Auth request going to the expected Supabase project domain. Do not share the publishable key or any service-role key when asking for help.

## Vercel deployment

Import the repository into Vercel and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under **Project Settings → Environment Variables**. Redeploy after adding or changing them. Do not add a Supabase service-role key to Vercel client-side environment variables.

## Records and permissions

- **Normal User (Member) Dashboard**: Displays the member's personal payment record (whether they have paid or are pending for the selected month, lifetime payments, and contribution history) and transparent fund balance totals. Normal users cannot view other members' individual payment records or see who has not paid.
- **Admin Visibility**: Only administrators can view the full roster of who has paid and who is unpaid, filter unpaid members with one click, and copy reminder lists.
- **Site-managed Admin Roles**: Administrators can promote normal users to administrators and manage account roles directly from the site (User Roles & Admins tab).
- **Member Approval Process**: New accounts provide their name and requested registration number (1–220) and await approval. Administrators can review, match, and accept or decline members directly from the site (Approvals tab).
- **Events & Expenses**: Track batch occasions (trips, tournaments, gatherings) with custom targets, itemized collections, and expenses. Both normal users and admins can view events and their financial breakdowns; admins can add events and record collections/expenses.
- Row-level security (RLS) in Supabase enforces that normal users can only query their own monthly contributions and all event records. Admins have access to the full ledger and directory.

## Checks

```sh
npm run build
npm run lint
```
