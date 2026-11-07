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
3. In **Project Settings → API**, copy the Project URL and the public anon key into `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-key
   ```

4. Start the app and create your first account. In Supabase **SQL Editor**, promote that account to admin:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'your-email@example.com';
   ```

New accounts automatically join as viewers after signing up and confirming their email. Viewers can see the fund overview totals only; admins can access member details, contributions, and transactions and manage all fund records. Running the schema on an existing project also changes pending profiles to viewers. To promote an account to admin, use the SQL above.

Supabase email confirmation may need to be enabled or configured for your group under **Authentication → Providers / URL Configuration**. For production, set your deployed Vercel domain as the site URL and redirect URL.

### If sign-up says “Failed to fetch”

This means the browser could not reach the Supabase Auth endpoint; it is not an invalid-password response. Check that:

- `VITE_SUPABASE_URL` is the Project URL from the same Supabase project as `VITE_SUPABASE_ANON_KEY`. The URL should look like `https://<project-ref>.supabase.co`.
- The Supabase project is active and your browser can reach it.
- After editing local `.env.local`, stop and restart `npm run dev`. After editing Vercel environment variables, redeploy the app.
- The browser's Network panel shows the Auth request going to the expected Supabase project domain. Do not share the anon key or any service-role key when asking for help.

## Vercel deployment

Import the repository into Vercel and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Project Settings → Environment Variables**. Redeploy after adding or changing them. Do not add a Supabase service-role key to Vercel client-side environment variables.

## Records and permissions

- Members have unique registration numbers from 1 through 220. Archiving a member preserves their earlier transactions and keeps their registration number reserved.
- The default monthly contribution is LKR 500. Admins can adjust a recorded amount if needed; only one monthly payment per member and month is allowed.
- Event collections are a separate ledger category and are included in the overall available balance. Expenses and withdrawals reduce the balance.
- Viewers can see aggregate fund totals only. Admins can view full records, add/archive members, record contributions and transactions, and delete an incorrect transaction.
- Row-level security and a restricted summary function enforce the viewer/admin distinction in Supabase; it does not rely only on the app interface.

## Checks

```sh
npm run build
npm run lint
```
