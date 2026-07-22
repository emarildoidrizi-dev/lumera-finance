# Lumera Finance

**Your private financial command center.**

This is the real GitHub/Vercel-ready Lumera Finance foundation.

## Included now

- Premium public landing page
- Real Supabase registration and login
- Email confirmation callback
- Protected private dashboard
- Secure logout
- Real user-specific transaction database
- Row Level Security policies
- Responsive design
- Bills, Budget, Goals and Net Worth module shells

## 1. Upload this project to GitHub

Upload **all files and folders inside this project** to the root of your `lumera-finance` repository.

## 2. Configure Supabase

In Supabase:

1. Open **SQL Editor**.
2. Open `supabase/schema.sql` from this project.
3. Copy the complete SQL into Supabase and click **Run**.
4. Go to **Project Settings -> API**.
5. Copy the Project URL and anon/publishable key.

## 3. Configure authentication URLs

In Supabase go to **Authentication -> URL Configuration**.

For local testing:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

After Vercel deployment, also add:

- `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback`

## 4. Environment variables

Create `.env.local` locally from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

On Vercel, add the same variables under **Project Settings -> Environment Variables**. Use your live Vercel URL for `NEXT_PUBLIC_SITE_URL`.

## 5. Deploy with Vercel

1. In Vercel click **Add New -> Project**.
2. Import the GitHub repository `lumera-finance`.
3. Vercel will detect Next.js automatically.
4. Add the three environment variables.
5. Click **Deploy**.

## 6. Local testing (optional)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Security

- Never commit `.env.local`.
- Never place the Supabase service-role key in browser code or Vercel public variables.
- The included Row Level Security rules ensure authenticated users can access only their own transactions.

## Current status

Sprint 1 is functional. Transactions are live. Bills, Budget, Goals, Net Worth and payments are prepared for subsequent sprints.
