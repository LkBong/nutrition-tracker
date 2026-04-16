# Nutrition Tracker App — Implementation Plan

## Context

Build a personal nutrition tracking PWA (Progressive Web App) that works on both laptop and iPhone via Safari. The app allows a single user to log food by scanning barcodes, taking photos for AI recognition, or searching by text — then visualises daily and weekly nutrition data in a dashboard.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Single codebase for web + PWA |
| Styling | Tailwind CSS + shadcn/ui | Fast, accessible, mobile-first |
| Database + Auth | Supabase (free tier) | Postgres + auth, no backend to manage |
| Barcode scanning | `@zxing/browser` | Real-time barcode detection in camera stream |
| Food photo AI | CalorieNinjas `/v1/imagetextnutrition` | Purpose-built food image → nutrition API; returns nutrients directly, no secondary lookup needed |
| Nutrition data | CalorieNinjas `/v1/nutrition` + Open Food Facts (free) | CalorieNinjas handles natural-language text search; Open Food Facts for barcode lookups (no key needed) |
| Charts | Recharts | SSR-compatible, simple React integration |
| Deployment | Vercel (free tier) | Zero-config Next.js hosting |
| PWA | `next-pwa` | Service worker + manifest generation |

---

## Data Model (Supabase)

```sql
-- Extends auth.users (created automatically by Supabase)
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id),
  -- TDEE inputs (used to auto-calculate goals)
  age_years        INT,
  weight_kg        FLOAT,
  height_cm        FLOAT,
  sex              TEXT CHECK (sex IN ('male','female')),
  activity_level   TEXT CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal             TEXT CHECK (goal IN ('lose','maintain','gain')),
  -- Manually overridable targets (NULL = use auto-calculated value)
  calorie_goal_override     INT,
  protein_goal_g_override   INT,
  fat_goal_g_override       INT,
  carbs_goal_g_override     INT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
-- Effective goals are computed client-side:
-- if override is set → use override, else → compute from TDEE inputs

-- Shared food cache (avoids re-querying external APIs)
CREATE TABLE foods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  barcode         TEXT UNIQUE,
  brand           TEXT,
  calories_kcal   FLOAT,   -- per 100g
  protein_g       FLOAT,
  fat_g           FLOAT,
  carbs_g         FLOAT,
  fiber_g         FLOAT,
  sugar_g         FLOAT,
  sodium_mg       FLOAT,
  source          TEXT,    -- 'openfoodfacts' | 'calorieninjas' | 'manual'
  external_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX foods_barcode_idx ON foods(barcode);
CREATE INDEX foods_name_trgm_idx ON foods USING gin(name gin_trgm_ops);

-- Per-user meal log
CREATE TABLE food_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  food_id     UUID NOT NULL REFERENCES foods(id),
  meal_type   TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  quantity_g  FLOAT NOT NULL,
  logged_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX food_logs_user_date ON food_logs(user_id, logged_at DESC);
```

Enable Row Level Security on `profiles` and `food_logs` so users can only read/write their own rows.

---

## Project Structure

```
nutrition-tracker/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← bottom nav shell
│   │   ├── dashboard/page.tsx  ← charts + daily summary
│   │   ├── log/page.tsx        ← camera + search entry point
│   │   ├── history/page.tsx    ← past logs by date
│   │   └── settings/page.tsx   ← goals, profile
│   ├── api/
│   │   ├── food/barcode/route.ts   ← Open Food Facts lookup
│   │   ├── food/photo/route.ts     ← CalorieNinjas /v1/imagetextnutrition
│   │   └── food/search/route.ts    ← CalorieNinjas /v1/nutrition (text)
│   ├── layout.tsx              ← PWA meta tags, fonts
│   └── page.tsx                ← redirect to /dashboard
├── components/
│   ├── camera/
│   │   ├── CameraView.tsx      ← unified camera (barcode + photo)
│   │   └── BarcodeOverlay.tsx  ← SVG viewfinder
│   ├── dashboard/
│   │   ├── DailySummaryCard.tsx
│   │   ├── MacroDonut.tsx
│   │   ├── CalorieProgressBar.tsx
│   │   └── WeeklyTrendChart.tsx
│   ├── food/
│   │   ├── FoodSearchBar.tsx
│   │   ├── FoodResultCard.tsx
│   │   └── PortionSelector.tsx ← set grams + meal type before logging
│   └── ui/                     ← shadcn components
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← browser client
│   │   └── server.ts           ← server component client
│   ├── openfoodfacts.ts        ← barcode → nutrition
│   ├── calorieninjas.ts        ← photo (/v1/imagetextnutrition) + text (/v1/nutrition)
│   ├── tdee.ts                 ← BMR/TDEE calculation + macro splits
│   └── nutrients.ts            ← scale nutrients by portion size
├── public/
│   ├── manifest.json
│   └── icons/                  ← 192×192 and 512×512 PNG icons
└── next.config.js              ← next-pwa config
```

---

## Key API Flows

### 1. Camera view (unified)
- `CameraView.tsx` opens device camera via `getUserMedia`
- `@zxing/browser` scans every video frame for barcodes in the background
- When a barcode is detected → calls `/api/food/barcode?code=...` → Open Food Facts
- "Take Photo" button → captures frame → sends image to `/api/food/photo` → CalorieNinjas
- If neither works → shows `FoodSearchBar` for text fallback

### 2. Barcode flow (`/api/food/barcode`)
1. Check `foods` table cache by barcode
2. If miss → call `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
3. Normalise response → insert into `foods` → return to client

### 3. Photo flow (`/api/food/photo`)
1. Receive image file (multipart form data)
2. Call CalorieNinjas `POST https://api.calorieninjas.com/v1/imagetextnutrition` with the image
3. Response contains item name + full nutrition breakdown (calories, protein, fat, carbs, etc.) directly — no secondary lookup needed
4. Normalise response → cache in `foods` → return to client with detected weight pre-filled

### 4. Text search (`/api/food/search?q=...`)
1. Accept natural language query (e.g. `"2 scrambled eggs and a banana"`)
2. Call CalorieNinjas `GET https://api.calorieninjas.com/v1/nutrition?query=...`
3. Returns an array of matched food items each with full nutrition breakdown
4. Cache any new items in `foods` table → return results to client
5. User picks an item (or all) to log — portion is already embedded in the query

---

## Implementation Phases

### Phase 1 — Scaffold (foundation)
- [ ] `npx create-next-app@latest nutrition-tracker --typescript --tailwind --app`
- [ ] Install: `@supabase/supabase-js @supabase/ssr shadcn/ui next-pwa @zxing/browser recharts`
- [ ] Supabase project: run schema SQL, enable RLS, add policies
- [ ] `public/manifest.json` + icons
- [ ] `next.config.js` with `next-pwa`
- [ ] Mobile-first layout with bottom nav (Dashboard / Log / History)

### Phase 2 — Auth + Onboarding
- [ ] Supabase email/password auth (no OAuth needed for personal use)
- [ ] Login + signup pages
- [ ] Middleware to protect `/(app)` routes
- [ ] Auto-create `profiles` row on first login (Supabase trigger)
- [ ] Onboarding wizard on first login: age, weight, height, sex, activity level, goal (lose/maintain/gain)
- [ ] `lib/tdee.ts`: Mifflin-St Jeor BMR × activity multiplier → TDEE → macro split
- [ ] Settings page: shows calculated targets with per-field manual override toggles

### Phase 3 — Food Identification
- [ ] `CameraView.tsx`: `getUserMedia` with `facingMode: environment` for rear camera
- [ ] `@zxing/browser` continuous barcode scan loop on video stream
- [ ] `/api/food/barcode` route → Open Food Facts
- [ ] Photo capture button → `/api/food/photo` → CalorieNinjas `/v1/imagetextnutrition`
- [ ] `/api/food/search` → CalorieNinjas `/v1/nutrition` (natural language, e.g. "2 eggs")
- [ ] `FoodSearchBar` text fallback UI with natural-language input hint

### Phase 4 — Logging
- [ ] `PortionSelector` component: adjust grams, pick meal type
- [ ] `POST /api/logs` → insert into `food_logs`
- [ ] Daily log view on `/history` grouped by meal type
- [ ] Delete log entry

### Phase 5 — Dashboard
- [ ] Compute daily totals from `food_logs` (scale by `quantity_g / 100`)
- [ ] `CalorieProgressBar`: actual vs goal
- [ ] `MacroDonut`: protein / fat / carbs breakdown (Recharts PieChart)
- [ ] `WeeklyTrendChart`: 7-day calorie line (Recharts LineChart)
- [ ] Nutrient breakdown table (fiber, sugar, sodium)

### Phase 6 — PWA Polish
- [ ] Test camera + barcode on iOS Safari (requires HTTPS — Vercel handles this)
- [ ] Add `apple-touch-icon` + `apple-mobile-web-app-capable` meta tags
- [ ] Service worker offline caching for app shell
- [ ] "Add to Home Screen" prompt banner

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only (for admin DB ops)
CALORIENINJAS_API_KEY=          # calorieninjas.com/api — photo + text nutrition
```

---

## Verification Checklist

- [ ] Barcode scan: hold phone over a food product → nutrients appear within 2s
- [ ] Photo recognition: photo of an apple → CalorieNinjas returns nutrition breakdown directly
- [ ] Text search: type "2 scrambled eggs and toast" → CalorieNinjas returns per-item breakdown
- [ ] Log food: select portion + meal → appears in daily log
- [ ] Dashboard: logged calories match sum of log entries
- [ ] PWA install: visit on iPhone Safari → "Add to Home Screen" → opens full-screen
- [ ] Camera works on iPhone: rear camera opens in `/log`, barcode auto-detects
- [ ] RLS: only own logs visible (verify via Supabase table editor)
