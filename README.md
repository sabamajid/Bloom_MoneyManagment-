# Bloom (MoneyManager)

Modern, minimal, pastel-forward personal expense tracker:

- **Frontend**: Next.js (App Router) + Tailwind CSS v4
- **Backend**: Next.js Route Handlers (`/api/*`)
- **Auth + DB**: Supabase (Auth + Postgres + RLS)
- **Deploy**: Vercel-ready

## Local setup

### 1) Install

```bash
npm install
```

### 2) Supabase project

Create a Supabase project, then run the SQL in `supabase/schema.sql` (SQL Editor).

### 3) Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4) Supabase Auth URLs

In Supabase **Authentication -> URL Configuration**, set:

- **Site URL**: `http://localhost:3000` (prod: your Vercel domain)
- **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://YOUR_PRODUCTION_DOMAIN/auth/callback`

This app uses the PKCE flow via `app/auth/callback/route.ts` for email confirmations/magic links.

### 5) Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy (Vercel)

- Import the repo in Vercel
- Add the same `NEXT_PUBLIC_*` env vars
- Ensure Supabase redirect URLs include your production domain

## App routes

- `/` marketing / landing
- `/login`, `/signup`
- `/dashboard` protected overview
- `/expenses` protected list + filters + delete
- `/settings` themes + limits + categories
- `/analytics` visual analytics (pie/bar/line)
- `/api/expenses` GET (optional `?category=`), POST
- `/api/expenses/[id]` DELETE
- `/api/monthly-limit` GET/PUT (`?month=YYYY-MM`)
- `/api/categories` GET/POST
- `/api/categories/[id]` DELETE
- `/api/category-limits` PUT

## Notes

- Categories include predefined defaults plus user-added categories from Settings.
- Row Level Security ensures users can only access their own `expenses` rows.
- Dashboard supports a **monthly limit** and shows **spent this month** + **amount left**.
- Settings lets users switch themes, add custom categories, and save category limits.
