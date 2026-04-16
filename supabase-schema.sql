-- NOTE: Enable pg_trgm via Supabase Dashboard → Database → Extensions first
-- Then run the rest of this file in SQL Editor

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age_years               INT,
  weight_kg               FLOAT,
  height_cm               FLOAT,
  sex                     TEXT CHECK (sex IN ('male', 'female')),
  activity_level          TEXT CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal                    TEXT CHECK (goal IN ('lose','maintain','gain')),
  calorie_goal_override   INT,
  protein_goal_g_override INT,
  fat_goal_g_override     INT,
  carbs_goal_g_override   INT,
  onboarding_complete     BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (new.id) ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FOODS (shared cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS foods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  barcode       TEXT UNIQUE,
  brand         TEXT,
  calories_kcal FLOAT,
  protein_g     FLOAT,
  fat_g         FLOAT,
  carbs_g       FLOAT,
  fiber_g       FLOAT,
  sugar_g       FLOAT,
  sodium_mg     FLOAT,
  source        TEXT,
  external_id   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS foods_barcode_idx ON foods (barcode);
CREATE INDEX IF NOT EXISTS foods_name_trgm_idx ON foods USING gin (name gin_trgm_ops);

-- Foods are readable by all authenticated users (shared cache)
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read foods"
  ON foods FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert foods"
  ON foods FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- FOOD LOGS (per-user)
-- ============================================================
CREATE TABLE IF NOT EXISTS food_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id     UUID NOT NULL REFERENCES foods(id),
  meal_type   TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  quantity_g  FLOAT NOT NULL,
  logged_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_logs_user_date ON food_logs (user_id, logged_at DESC);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON food_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON food_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON food_logs FOR DELETE USING (auth.uid() = user_id);
