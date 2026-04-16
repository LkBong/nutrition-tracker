# Nutrition Tracker

A personal nutrition tracking app that runs in your browser and installs on iPhone via Safari — no App Store required. Log food by scanning a barcode, taking a photo, or typing a description. Track calories and macros on a live dashboard.

---

## Getting started

There are two ways to use this app:

**Option A — Use the hosted version.** The app is already deployed and running. Just [create an account](#option-a--use-the-hosted-version) and start logging. No setup required.

**Option B — Self-host your own instance.** Run your own copy with your own database and API keys. Useful if you want full control over your data or want to modify the app. Requires a free Supabase account, Vercel account, and a Google AI API key.

---

## Features

- **Barcode scan** — point your camera at any packaged food, nutrients appear automatically
- **Photo recognition** — take a photo of a meal and AI identifies the food and estimates portions
- **Text search** — type naturally, e.g. "2 scrambled eggs and a slice of toast"
- **Daily dashboard** — calorie progress, macro breakdown (protein/fat/carbs donut), 7-day trend chart
- **History** — browse past days, view logs grouped by meal type, delete entries
- **Auto-calculated targets** — enter your age, weight, height, and goal; TDEE is calculated for you
- **Manual overrides** — set your own calorie or macro targets if you prefer
- **iPhone home screen** — install via Safari for a full-screen, app-like experience

---

## Option A — Use the hosted version

Visit the app at **[your-deployment-url.vercel.app]** and click **Create account**. That's it.

### First run
After signing up you'll go through a short setup wizard: age, weight, height, sex, activity level, and goal (lose / maintain / gain). Your daily calorie and macro targets are calculated automatically — you can adjust them any time in Settings.

### Install on iPhone
For the best experience, add the app to your iPhone home screen:

1. Open the app URL in **Safari**
2. Tap the **Share** button (box with arrow) at the bottom
3. Tap **Add to Home Screen**

The app will open full-screen from your home screen, just like a native app. Camera and barcode scanning work fully this way.

---

## Option B — Self-host your own instance

You'll need free accounts on three services: Supabase (database), Vercel (hosting), and Google AI Studio (food recognition API).

### Step 1 — Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Dashboard → Database → Extensions** and enable `pg_trgm`
3. Go to **Dashboard → SQL Editor**, paste the contents of [`supabase-schema.sql`](supabase-schema.sql), and click **Run**
4. Go to **Dashboard → Authentication → Providers → Email** and disable "Confirm email"
5. Note your **Project URL** and **anon public key** from Dashboard → Settings → API

### Step 2 — Get a Gemini API key

1. Visit [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with Google
2. Click **Create API Key**
3. Go to [console.cloud.google.com/billing](https://console.cloud.google.com/billing) and link a billing account — this unlocks the free quota (1,500 requests/day). You will not be charged within free limits.

### Step 3 — Deploy to Vercel

1. Fork this repository to your GitHub account
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository
3. Add these environment variables in **Vercel → Project → Settings → Environment Variables**:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `GEMINI_API_KEY` | Google AI Studio |

4. Click **Deploy** — Vercel gives you a public HTTPS URL automatically

### Step 4 — Create your account

Open your Vercel URL, click **Create account**, and complete the onboarding wizard.

### Step 5 — Install on iPhone (optional)

Open your Vercel URL in Safari → Share → **Add to Home Screen**.

### Running locally

```bash
git clone https://github.com/your-username/nutrition-tracker.git
cd nutrition-tracker
npm install
cp .env.local.example .env.local
# Fill in the four variables
npm run dev
# Open http://localhost:3000
```

Camera and barcode features work on localhost in Chrome/Edge. iOS requires the Vercel HTTPS URL.

---

## Using the app

### Logging food

Open the **Log** tab (camera icon in the bottom nav):

- **Barcode**: point your rear camera at a product barcode — it detects automatically, no button needed
- **Photo**: tap "Take Photo" to capture a meal; AI identifies the food and estimates portion weights
- **Text**: type a natural language description, including quantities (e.g. "100g greek yogurt and a banana")

After results appear, tap a food card to open the portion selector. Adjust grams, select the meal type (breakfast / lunch / dinner / snack), and tap **Add to log**.

### Dashboard
- Today's calorie intake vs your goal
- Macro breakdown (protein, fat, carbs) as a donut chart
- Calorie trend for the past 7 days with your goal as a reference line
- Micronutrient summary (fiber, sugar, sodium)

### History
Browse past days with the left/right arrows. Entries are grouped by meal type. Tap the trash icon to delete an entry.

### Settings
- Edit your body profile — targets recalculate automatically
- Override any target manually (calories, protein, fat, carbs)
- Sign out

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database + Auth | Supabase (PostgreSQL) |
| Food AI | Google Gemini 2.5 Flash Lite |
| Barcode scanning | @zxing/browser |
| Barcode nutrition data | Open Food Facts (free, no key) |
| Charts | Recharts |
| Deployment | Vercel |
