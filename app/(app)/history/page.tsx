"use client";

import { useEffect, useState } from "react";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { scaleNutrients, sumNutrients } from "@/lib/nutrients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface LogEntry {
  id: string;
  meal_type: string;
  quantity_g: number;
  logged_at: string;
  foods: {
    name: string;
    brand?: string;
    calories_kcal: number | null;
    protein_g: number | null;
    fat_g: number | null;
    carbs_g: number | null;
    fiber_g: number | null;
    sugar_g: number | null;
    sodium_mg: number | null;
  };
}

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export default function HistoryPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs(date);
  }, [date]);

  async function loadLogs(d: string) {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("food_logs")
      .select(`id, meal_type, quantity_g, logged_at,
        foods (name, brand, calories_kcal, protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg)`)
      .gte("logged_at", `${d}T00:00:00.000Z`)
      .lt("logged_at", `${d}T23:59:59.999Z`)
      .order("logged_at", { ascending: true });

    setLogs((data as unknown as LogEntry[]) ?? []);
    setLoading(false);
  }

  async function deleteLog(id: string) {
    const res = await fetch(`/api/logs?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Removed");
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  function changeDate(delta: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  }

  const byMeal = MEAL_ORDER.reduce<Record<string, LogEntry[]>>((acc, m) => {
    acc[m] = logs.filter((l) => l.meal_type === m);
    return acc;
  }, {});

  const totals = sumNutrients(
    logs.map((l) =>
      scaleNutrients(
        {
          calories_kcal: l.foods.calories_kcal,
          protein_g: l.foods.protein_g,
          fat_g: l.foods.fat_g,
          carbs_g: l.foods.carbs_g,
          fiber_g: l.foods.fiber_g,
          sugar_g: l.foods.sugar_g,
          sodium_mg: l.foods.sodium_mg,
        },
        l.quantity_g
      )
    )
  );

  const isToday = date === new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-lg p-4">
      {/* Date nav */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">
          {isToday
            ? "Today"
            : new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => changeDate(1)}
          disabled={isToday}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Daily totals */}
      {logs.length > 0 && (
        <Card className="mb-4">
          <CardContent className="grid grid-cols-4 gap-2 py-3 text-center">
            {[
              { label: "Calories", value: totals.calories_kcal, unit: "kcal" },
              { label: "Protein", value: totals.protein_g, unit: "g" },
              { label: "Fat", value: totals.fat_g, unit: "g" },
              { label: "Carbs", value: totals.carbs_g, unit: "g" },
            ].map(({ label, value, unit }) => (
              <div key={label}>
                <p className="text-lg font-bold tabular-nums">
                  {value != null ? Math.round(value) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{unit === "kcal" ? "kcal" : unit}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No food logged for this day</p>
      ) : (
        <div className="space-y-4">
          {MEAL_ORDER.map((meal) => {
            const entries = byMeal[meal];
            if (!entries.length) return null;
            return (
              <div key={meal}>
                <h2 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
                  {meal}
                </h2>
                <div className="space-y-1.5">
                  {entries.map((log) => {
                    const scaled = scaleNutrients(
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
                    );
                    return (
                      <Card key={log.id}>
                        <CardContent className="flex items-center gap-3 py-2.5 px-3">
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium capitalize">
                              {log.foods.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {log.quantity_g}g ·{" "}
                              {scaled.calories_kcal != null
                                ? `${Math.round(scaled.calories_kcal)} kcal`
                                : "—"}
                            </p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground shrink-0">
                            P {scaled.protein_g != null ? Math.round(scaled.protein_g) : "—"}g
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-500"
                            onClick={() => deleteLog(log.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <Separator className="mt-4" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
