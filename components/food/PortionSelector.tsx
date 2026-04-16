"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { scaleNutrients } from "@/lib/nutrients";
import type { FoodItem } from "./FoodResultCard";

interface Props {
  food: FoodItem;
  onLogged: () => void;
  onCancel: () => void;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export default function PortionSelector({ food, onLogged, onCancel }: Props) {
  const [quantity, setQuantity] = useState(
    String(food.serving_size_g ?? 100)
  );
  const [mealType, setMealType] = useState<string>("snack");
  const [loading, setLoading] = useState(false);

  const g = parseFloat(quantity) || 0;
  const scaled = scaleNutrients(
    {
      calories_kcal: food.calories_kcal,
      protein_g: food.protein_g,
      fat_g: food.fat_g,
      carbs_g: food.carbs_g,
      fiber_g: food.fiber_g,
      sugar_g: food.sugar_g,
      sodium_mg: food.sodium_mg,
    },
    g
  );

  async function handleLog() {
    if (g <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food_id: food.id, meal_type: mealType, quantity_g: g }),
      });
      if (!res.ok) throw new Error("Failed to log");
      toast.success(`Logged ${food.name}`);
      onLogged();
    } catch {
      toast.error("Failed to log food");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold capitalize">{food.name}</p>
        {food.brand && <p className="text-sm text-muted-foreground">{food.brand}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="quantity">Quantity (g)</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="text-center text-lg font-medium"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Meal</Label>
          <Select value={mealType} onValueChange={(v) => setMealType(v ?? "snack")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEAL_TYPES.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scaled nutrition preview */}
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Nutrition for {g}g
        </p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Calories", value: scaled.calories_kcal, unit: "kcal" },
            { label: "Protein", value: scaled.protein_g, unit: "g" },
            { label: "Fat", value: scaled.fat_g, unit: "g" },
            { label: "Carbs", value: scaled.carbs_g, unit: "g" },
          ].map(({ label, value, unit }) => (
            <div key={label}>
              <p className="text-base font-bold tabular-nums">
                {value != null ? Math.round(value) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {unit === "kcal" ? "kcal" : `${unit}`}
              </p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Back
        </Button>
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={handleLog}
          disabled={loading || g <= 0}
        >
          {loading ? "Logging…" : "Log Food"}
        </Button>
      </div>
    </div>
  );
}
