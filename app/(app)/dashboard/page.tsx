"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateGoals } from "@/lib/tdee";
import { scaleNutrients, sumNutrients } from "@/lib/nutrients";
import CalorieProgressBar from "@/components/dashboard/CalorieProgressBar";
import MacroDonut from "@/components/dashboard/MacroDonut";
import WeeklyTrendChart from "@/components/dashboard/WeeklyTrendChart";
import NutrientGrid from "@/components/dashboard/NutrientGrid";
import type { NutritionGoals } from "@/lib/tdee";

interface FoodLog {
  id: string;
  meal_type: string;
  quantity_g: number;
  logged_at: string;
  foods: {
    calories_kcal: number | null;
    protein_g: number | null;
    fat_g: number | null;
    carbs_g: number | null;
    fiber_g: number | null;
    sugar_g: number | null;
    sodium_mg: number | null;
  };
}

export default function DashboardPage() {
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [todayLogs, setTodayLogs] = useState<FoodLog[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ date: string; calories: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile for goals
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        const computed = profile.age_years
          ? calculateGoals({
              age_years: profile.age_years,
              weight_kg: profile.weight_kg,
              height_cm: profile.height_cm,
              sex: profile.sex,
              activity_level: profile.activity_level,
              goal: profile.goal,
            })
          : { calories: 2000, protein_g: 150, fat_g: 65, carbs_g: 250 };

        setGoals({
          calories: profile.calorie_goal_override ?? computed.calories,
          protein_g: profile.protein_goal_g_override ?? computed.protein_g,
          fat_g: profile.fat_goal_g_override ?? computed.fat_g,
          carbs_g: profile.carbs_goal_g_override ?? computed.carbs_g,
        });
      }

      // Today's logs
      const today = new Date().toISOString().split("T")[0];
      const { data: logs } = await supabase
        .from("food_logs")
        .select(`id, meal_type, quantity_g, logged_at,
          foods (calories_kcal, protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg)`)
        .eq("user_id", user.id)
        .gte("logged_at", `${today}T00:00:00.000Z`)
        .lt("logged_at", `${today}T23:59:59.999Z`);

      setTodayLogs((logs as unknown as FoodLog[]) ?? []);

      // Last 7 days for trend
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const { data: weekLogs } = await supabase
        .from("food_logs")
        .select("logged_at, quantity_g, foods (calories_kcal)")
        .eq("user_id", user.id)
        .gte("logged_at", since.toISOString());

      const byDate: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (weekLogs ?? []).forEach((log: any) => {
        const d = log.logged_at.split("T")[0];
        const cal = ((log.foods?.calories_kcal ?? 0) * log.quantity_g) / 100;
        byDate[d] = (byDate[d] ?? 0) + cal;
      });

      const trend = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split("T")[0];
        return { date: key, calories: Math.round(byDate[key] ?? 0) };
      });
      setWeeklyData(trend);
      setLoading(false);
    }
    load();
  }, []);

  const totals = sumNutrients(
    todayLogs.map((log) =>
      scaleNutrients(
        {
          calories_kcal: log.foods.calories_kcal,
          protein_g: log.foods.protein_g,
          fat_g: log.foods.fat_g,
          carbs_g: log.foods.carbs_g,
          fiber_g: log.foods.fiber_g,
          sugar_g: log.foods.sugar_g,
          sodium_mg: log.foods.sodium_mg,
        },
        log.quantity_g
      )
    )
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-xl font-bold">
        {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      </h1>

      {goals && (
        <CalorieProgressBar
          actual={totals.calories_kcal ?? 0}
          goal={goals.calories}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        {goals && (
          <MacroDonut
            protein={totals.protein_g ?? 0}
            fat={totals.fat_g ?? 0}
            carbs={totals.carbs_g ?? 0}
            goals={goals}
          />
        )}
        <NutrientGrid
          fiber={totals.fiber_g}
          sugar={totals.sugar_g}
          sodium={totals.sodium_mg}
        />
      </div>

      <WeeklyTrendChart data={weeklyData} goalCalories={goals?.calories} />
    </div>
  );
}
