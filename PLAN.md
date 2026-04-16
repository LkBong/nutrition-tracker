# Nutrition Tracker — Developer Reference

## Overview

A personal nutrition tracking PWA built with Next.js 16, Supabase, and Google Gemini. Users log food via barcode scan, photo recognition, or natural language text. Daily and weekly nutrition data is visualised on a dashboard.

This document covers architecture, data flow, gotchas, and how to extend the app.

---

## Tech Stack

| Layer | Library | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 16.2.4 | App Router, TypeScript, Tailwind v4 |
| UI | shadcn/ui | v4 | Uses `@base-ui/react` — NOT `@radix-ui` (type signatures differ) |
| Database + Auth | Supabase | free tier | PostgreSQL + RLS + Auth |
| Barcode scanning | `@zxing/browser` | latest | Continuous scan via `BrowserMultiFormatReader` |
| Food AI | `@google/genai` | latest | Text search + photo recognition. NOT `@google/generative-ai` (deprecated) |
| Charts | Recharts | v3 | PieChart (macro donut), LineChart (weekly trend) |
| PWA | `@ducanh2912/next-pwa` | latest | Service worker + manifest |
| Deployment | Vercel | free tier | HTTPS required for iOS camera |

### Critical build notes

- **Always use `--webpack` flag**: `next dev --webpack` / `next build --webpack`
  - `@ducanh2912/next-pwa` injects webpack config. Next.js 16 defaults to Turbopack, which conflicts.
  - Both `dev` and `build` scripts in `package.json` already include this flag.
- **`proxy.ts` not `middleware.ts`**: Next.js 16 renamed the auth middleware convention. The exported function is also `proxy`, not `middleware`.

---

## Project Structure

```
nutrition-tracker/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          ← email/password login
│   │   └── signup/page.tsx         ← signup + redirect to onboarding
│   ├── (app)/
│   │   ├── layout.tsx              ← bottom nav shell (BottomNav.tsx)
│   │   ├── dashboard/page.tsx      ← daily summary + charts
│   │   ├── log/page.tsx            ← camera + search entry point
│   │   ├── history/page.tsx        ← past logs by date, grouped by meal
│   │   └── settings/page.tsx       ← profile edit + goal overrides + sign out
│   ├── api/
│   │   ├── food/barcode/route.ts   ← Open Food Facts lookup + foods cache
│   │   ├── food/photo/route.ts     ← Gemini vision → nutrition JSON
│   │   └── food/search/route.ts    ← Gemini text → nutrition JSON
│   ├── api/logs/route.ts           ← GET (by date) + POST + DELETE food logs
│   ├── onboarding/page.tsx         ← first-run TDEE wizard
│   ├── layout.tsx                  ← root layout, PWA meta tags
│   └── page.tsx                    ← redirect to /dashboard
├── components/
│   ├── BottomNav.tsx               ← mobile nav (Dashboard / Log / History)
│   ├── camera/
│   │   └── CameraView.tsx          ← unified camera: barcode scan + photo capture + text fallback
│   ├── dashboard/
│   │   ├── CalorieProgressBar.tsx
│   │   ├── MacroDonut.tsx          ← Recharts PieChart
│   │   ├── WeeklyTrendChart.tsx    ← Recharts LineChart (7-day)
│   │   └── NutrientGrid.tsx        ← fiber, sugar, sodium grid
│   └── food/
│       ├── FoodResultCard.tsx      ← result card with "Add" button
│       ├── FoodSearchBar.tsx       ← natural language text input
│       └── PortionSelector.tsx     ← gram adjuster + meal type picker
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← browser Supabase client
│   │   └── server.ts               ← server component Supabase client
│   ├── gemini.ts                   ← searchByText() + searchByImage()
│   ├── openfoodfacts.ts            ← barcode → nutrition (no API key needed)
│   ├── tdee.ts                     ← Mifflin-St Jeor BMR + TDEE + macro split
│   ├── nutrients.ts                ← scaleNutrients(), sumNutrients()
│   └── utils.ts                    ← shadcn utility (cn)
├── proxy.ts                        ← auth middleware (protects /(app) routes)
├── supabase-schema.sql             ← run in Supabase SQL Editor to set up DB
└── public/
    ├── manifest.json
    └── icons/                      ← icon-192.png, icon-512.png
```

---

## Database Schema

Three tables. All nutrition values are stored **per 100g** and scaled at render time.

### `profiles`
Extends `auth.users`. Stores TDEE inputs and optional manual goal overrides.

```
id                      UUID  PK → auth.users
age_years               INT
weight_kg               FLOAT
height_cm               FLOAT
sex                     TEXT  ('male' | 'female')
activity_level          TEXT  ('sedentary' | 'light' | 'moderate' | 'active' | 'very_active')
goal                    TEXT  ('lose' | 'maintain' | 'gain')
calorie_goal_override   INT   NULL = use auto-calculated TDEE
protein_goal_g_override INT   NULL = use macro split default
fat_goal_g_override     INT
carbs_goal_g_override   INT
onboarding_complete     BOOL
created_at              TIMESTAMPTZ
```

Goal resolution (client-side, `lib/tdee.ts`):
- If `*_override` is set → use that value
- Otherwise → compute from TDEE: BMR (Mifflin-St Jeor) × activity multiplier × goal adjustment
- Macro split defaults: protein 30%, fat 25%, carbs 45% of TDEE calories

Auto-trigger `on_auth_user_created` inserts a blank `profiles` row on every signup.

### `foods`
Shared cache across all users. Avoids re-querying external APIs.

```
id            UUID  PK
name          TEXT
barcode       TEXT  UNIQUE (null for non-barcoded items)
brand         TEXT
calories_kcal FLOAT  per 100g
protein_g     FLOAT
fat_g         FLOAT
carbs_g       FLOAT
fiber_g       FLOAT
sugar_g       FLOAT
sodium_mg     FLOAT
source        TEXT  ('openfoodfacts' | 'gemini' | 'manual')
external_id   TEXT
created_at    TIMESTAMPTZ
```

Indexed on `barcode` (b-tree) and `name` (pg_trgm GIN — enable via Supabase Dashboard → Database → Extensions before running schema SQL).

### `food_logs`
Per-user meal entries.

```
id         UUID  PK
user_id    UUID  → auth.users
food_id    UUID  → foods
meal_type  TEXT  ('breakfast' | 'lunch' | 'dinner' | 'snack')
quantity_g FLOAT
logged_at  TIMESTAMPTZ
```

Indexed on `(user_id, logged_at DESC)` for efficient daily fetches.

### RLS summary

| Table | Read | Write |
|---|---|---|
| `profiles` | own row only | own row only |
| `foods` | all authenticated | all authenticated (shared cache) |
| `food_logs` | own rows only | own rows only |

---

## API Routes

### `GET /api/food/barcode?code={barcode}`
1. Check `foods` table for cached barcode
2. On miss → fetch `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
3. Normalise → upsert into `foods` → return `NormalizedFoodItem[]`

### `POST /api/food/photo`
Body: `multipart/form-data` with `image` file field.
1. Read file → convert to base64
2. Call `lib/gemini.ts → searchByImage(file)`
3. Gemini identifies all visible food items, estimates portion weights, returns nutrition per 100g
4. Cache results in `foods` table → return `NormalizedFoodItem[]`

### `GET /api/food/search?q={query}`
1. Call `lib/gemini.ts → searchByText(query)`
2. Gemini parses natural language (e.g. "2 scrambled eggs and toast") → per-item nutrition JSON
3. Cache in `foods` → return `NormalizedFoodItem[]`

### `GET /api/logs?date={YYYY-MM-DD}`
Returns all `food_logs` for the authenticated user on the given date, joined with `foods`.

### `POST /api/logs`
Body: `{ food_id, quantity_g, meal_type, logged_at? }`
Inserts a `food_logs` row for the current user.

### `DELETE /api/logs?id={log_id}`
Deletes a specific log entry (RLS enforces ownership).

---

## Key Library Details

### `lib/gemini.ts`

Uses `@google/genai` SDK (new package). Do **not** use `@google/generative-ai` (deprecated, v1beta endpoint).

```typescript
import { GoogleGenAI } from "@google/genai";
const MODEL = "gemini-2.5-flash-lite";

// Text: natural language → NormalizedFoodItem[]
export async function searchByText(query: string): Promise<NormalizedFoodItem[]>

// Photo: File → NormalizedFoodItem[]
export async function searchByImage(file: File): Promise<NormalizedFoodItem[]>
```

Both return `NormalizedFoodItem[]`:
```typescript
interface NormalizedFoodItem {
  name: string;
  serving_size_g: number;   // estimated typical serving or visual portion
  per100g: NutrientsPer100g;
}
```

Prompt instructs Gemini to return a strict JSON schema — `parseGeminiResponse()` strips markdown fences then `JSON.parse()`s the result.

### `lib/nutrients.ts`

```typescript
// Scale per-100g values to actual portion
scaleNutrients(per100g: NutrientsPer100g, quantity_g: number): NutrientsPer100g

// Sum an array of scaled nutrients (for daily totals)
sumNutrients(items: NutrientsPer100g[]): NutrientsPer100g
```

### `lib/tdee.ts`

```typescript
// Full auto-calculated goals from body profile
calculateGoals(inputs: TDEEInputs): NutritionGoals

// Merge auto-calculated goals with any manual overrides from profiles row
resolveGoals(profile: Profile): NutritionGoals
```

Mifflin-St Jeor BMR: `10×weight_kg + 6.25×height_cm − 5×age + (5 | −161)`
Activity multipliers: sedentary 1.2 → very_active 1.9
Goal adjustment: lose −500 kcal, maintain ±0, gain +300 kcal

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Safe to expose — enforced by RLS
SUPABASE_SERVICE_ROLE_KEY=         # Server-only — never expose to client
GEMINI_API_KEY=                    # From aistudio.google.com/apikey
```

**Gemini API key**: get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Free tier: 1,500 req/day. Requires a Google Cloud billing account to be linked even for free usage — link one at [console.cloud.google.com/billing](https://console.cloud.google.com/billing) (no charges within free limits).

---

## Known Gotchas

### shadcn Select `onValueChange` type
shadcn v4 uses `@base-ui/react` which passes `string | null` (not `string`) to `onValueChange`. Always add a null fallback:
```typescript
onValueChange={(v) => setMealType(v ?? "snack")}
```

### Supabase schema setup order
1. Enable `pg_trgm` via **Supabase Dashboard → Database → Extensions** (UI toggle) — do NOT use `CREATE EXTENSION` in SQL Editor, it aborts the transaction
2. Then run `supabase-schema.sql` in the SQL Editor

### Signup trigger
The `on_auth_user_created` trigger must exist or signup returns `500 "database error saving new user"`. If it's missing, re-run the `DROP/CREATE TRIGGER` block from `supabase-schema.sql`.

### Email confirmation
Supabase enables email confirmation by default. For local/personal use, disable it: **Authentication → Providers → Email → disable "Confirm email"**.

### Gemini model name
Current working model: `gemini-2.5-flash-lite`. To verify available models for a given key:
```
GET https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY
```

---

## Local Development

```bash
# Install dependencies
npm install

# Copy and fill in env vars
cp .env.local.example .env.local

# Start dev server (must use --webpack, already set in package.json)
npm run dev
# → http://localhost:3000 (or 3001 if 3000 is taken)
```

### Supabase setup (one-time)
1. Create a project at [supabase.com](https://supabase.com)
2. Dashboard → Database → Extensions → enable `pg_trgm`
3. Dashboard → SQL Editor → paste and run `supabase-schema.sql`
4. Dashboard → Authentication → Providers → Email → disable "Confirm email"
5. Copy `Project URL` and `anon key` into `.env.local`

### Production build

```bash
npm run build   # next build --webpack
npm start
```

---

## Deployment (Vercel)

HTTPS is required for iOS camera (`getUserMedia` with `facingMode: environment` is blocked on non-secure origins). Vercel provides HTTPS automatically.

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add all four environment variables in Vercel → Project → Settings → Environment Variables
4. Deploy

### iPhone PWA install
After deploying: open the Vercel URL in Safari → tap the Share button → "Add to Home Screen". The app will open full-screen with bottom nav, just like a native app.

---

## Extending the App

### Adding a new nutrient field
1. Add column to `foods` table in Supabase
2. Update `NutrientsPer100g` type in `lib/nutrients.ts`
3. Update `scaleNutrients` and `sumNutrients` to include the field
4. Update Gemini prompts in `lib/gemini.ts` to request the field
5. Update `NutrientGrid.tsx` (or wherever it's displayed) to render it

### Swapping the AI provider
`lib/gemini.ts` exports `searchByText(query)` and `searchByImage(file)` — both return `NormalizedFoodItem[]`. Swap the implementation inside those functions. The API routes and UI don't need to change.

### Adding OAuth login
Supabase Auth supports Google, GitHub, Apple etc. Add a provider in Supabase Dashboard → Authentication → Providers, then call `supabase.auth.signInWithOAuth()` from the login page.
