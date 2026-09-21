# Supabase Integration Guide — RealityLayer

This document provides a complete guide for the Supabase integration in RealityLayer.

## 1. Configured Project Credentials

The application is configured to connect to your live Supabase project:
- **Project URL:** `https://vlrbglsheehtkaoofzwk.supabase.co`
- **Publishable / Anon Key:** `sb_publishable_3lDIrx6u_Th8o4Lx6M9DvA_BHAfhOpm`
- **Secret / Service Role Key:** `[CONFIGURED_IN_ENV]`

These variables are configured in `.env` and documented in `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL="https://vlrbglsheehtkaoofzwk.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_3lDIrx6u_Th8o4Lx6M9DvA_BHAfhOpm"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-key"
```

---

## 2. Architecture & Modules

### `src/lib/supabase/client.ts`
Client-side Supabase SDK instance for React browser components:
```ts
import { getSupabaseBrowserClient, supabase } from '@/lib/supabase/client';

const client = getSupabaseBrowserClient();
```

### `src/lib/supabase/server.ts`
Privileged server-side Supabase client using the Service Role Secret Key (`SUPABASE_SERVICE_ROLE_KEY`):
```ts
import { getSupabaseAdmin, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';

if (isSupabaseConfigured()) {
  const { data, error } = await supabaseAdmin.client.from('news').select('*');
}
```

### `src/lib/supabase/types.ts`
Full TypeScript type definitions matching the Supabase PostgreSQL database schema (`User`, `Project`, `Crawl`, `Page`, `Link`, `Issue`, `news`, and RPC functions like `replace_news`).

---

## 3. Integrated Features

### A. Live News Feed & Atomic `replace_news` RPC
- **Endpoint:** `POST /api/news/refresh`
  - Fetches latest articles from Spaceflight News API (with offline fallbacks).
  - Executes the PostgreSQL function `replace_news(p_articles JSONB)` on Supabase atomically.
  - Keeps both Supabase Cloud and local database synchronized.
- **Endpoint:** `GET /api/news`
  - Queries Supabase `news` table in real-time with full filtering (`news_site`), search (`title`, `summary`), and sorting (`published_at`).
- **Endpoint:** `DELETE /api/news?id=...`
  - Deletes the article from Supabase and local storage.

### B. User Authentication & Registration
- **Sign-up (`POST /api/auth/signup`):**
  - Registers the user and synchronizes their account into Supabase `User` table.
- **Login (`src/lib/auth.ts`):**
  - If a user is not present in local SQLite, the authenticator checks Supabase `User` and automatically reconciles credentials.

### C. Projects & Crawl Engine
- **Project Creation (`POST /api/projects`):**
  - Persists projects to both local storage and Supabase `Project` table.
- **Crawl Lifecycle (`src/lib/crawler/engine.ts`):**
  - Syncs crawl status updates (`CRAWLING`, `COMPLETED`, `FAILED`), health score, discovered pages count, and analyzed count to Supabase `Crawl` and `Project` tables.

---

## 4. (Optional) Direct Prisma Connection via Supabase Connection Pooler

If you ever wish to have Prisma ORM connect directly to Supabase PostgreSQL (instead of dual-sync mode):
1. In your Supabase Dashboard: Go to **Project Settings** > **Database** > **Connection Pooling**.
2. Copy the Connection string (URI) mode (using port `6543` with `?pgbouncer=true`):
   ```env
   DATABASE_URL="postgresql://postgres.vlrbglsheehtkaoofzwk:[YOUR-DATABASE-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
3. In `prisma/schema.prisma`, update the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Run `npx prisma generate`.
