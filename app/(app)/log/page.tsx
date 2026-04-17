"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Camera, Check, ChevronDown, ChevronUp, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getMealTypeFromHour } from "@/lib/mealType";
import CameraView from "@/components/camera/CameraView";
import FoodSearchBar from "@/components/food/FoodSearchBar";
import ManualEntryDialog from "@/components/food/ManualEntryDialog";
import type { FoodItem } from "@/components/food/FoodResultCard";

type NutrientField = "calories_kcal" | "protein_g" | "fat_g" | "carbs_g" | "fiber_g" | "sugar_g" | "sodium_mg";

type NutrientEdit = Record<NutrientField, string>;

type Selection = {
  checked: boolean;
  quantity: string;
  expanded: boolean;
  nutrients: NutrientEdit;
  nutrientsEdited: boolean;
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

const NUTRIENT_FIELDS: { key: NutrientField; label: string; unit: string }[] = [
  { key: "calories_kcal", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fiber_g", label: "Fiber", unit: "g" },
  { key: "sugar_g", label: "Sugar", unit: "g" },
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
];

function getKey(food: FoodItem) {
  return food.id ?? food.name;
}

function toNutrientEdit(food: FoodItem): NutrientEdit {
  return {
    calories_kcal: String(food.calories_kcal ?? ""),
    protein_g: String(food.protein_g ?? ""),
    fat_g: String(food.fat_g ?? ""),
    carbs_g: String(food.carbs_g ?? ""),
    fiber_g: String(food.fiber_g ?? ""),
    sugar_g: String(food.sugar_g ?? ""),
    sodium_mg: String(food.sodium_mg ?? ""),
  };
}

export default function LogPage() {
  const [showCamera, setShowCamera] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [results, setResults] = useState<FoodItem[]>([]);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [mealType, setMealType] = useState(() => getMealTypeFromHour(new Date().getHours()));
  const [logging, setLogging] = useState(false);

  function handleFoodsFound(foods: FoodItem[]) {
    setShowCamera(false);
    setResults(foods);
    const init: Record<string, Selection> = {};
    foods.forEach((f) => {
      init[getKey(f)] = {
        checked: true,
        quantity: String(f.serving_size_g ?? 100),
        expanded: false,
        nutrients: toNutrientEdit(f),
        nutrientsEdited: false,
      };
    });
    setSelections(init);
  }

  function toggleItem(key: string) {
    setSelections((prev) => ({
      ...prev,
      [key]: { ...prev[key], checked: !prev[key].checked },
    }));
  }

  function toggleExpanded(key: string) {
    setSelections((prev) => ({
      ...prev,
      [key]: { ...prev[key], expanded: !prev[key].expanded },
    }));
  }

  function updateQuantity(key: string, q: string) {
    setSelections((prev) => ({
      ...prev,
      [key]: { ...prev[key], quantity: q },
    }));
  }

  function updateNutrient(key: string, field: NutrientField, value: string) {
    setSelections((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        nutrients: { ...prev[key].nutrients, [field]: value },
        nutrientsEdited: true,
      },
    }));
  }

  function handleManualAdd(food: FoodItem, quantity_g: number) {
    const key = getKey(food);
    setResults((prev) => {
      if (prev.find((f) => getKey(f) === key)) return prev;
      return [...prev, food];
    });
    setSelections((prev) => ({
      ...prev,
      [key]: {
        checked: true,
        quantity: String(quantity_g),
        expanded: false,
        nutrients: toNutrientEdit(food),
        nutrientsEdited: false,
      },
    }));
  }

  function clearResults() {
    setResults([]);
    setSelections({});
  }

  const checkedItems = results.filter((f) => selections[getKey(f)]?.checked);

  async function handleBatchLog() {
    if (!checkedItems.length) return;
    setLogging(true);
    try {
      await Promise.all(
        checkedItems.map(async (food) => {
          const key = getKey(food);
          const sel = selections[key];
          const qty = parseFloat(sel.quantity) || 100;

          // Patch food nutrients if user edited them
          if (sel.nutrientsEdited && food.id) {
            const nutrientPayload: Record<string, number | null> = {};
            NUTRIENT_FIELDS.forEach(({ key: field }) => {
              const val = parseFloat(sel.nutrients[field]);
              nutrientPayload[field] = isNaN(val) ? null : val;
            });
            await fetch("/api/food/edit", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: food.id, ...nutrientPayload }),
            });
          }

          return fetch("/api/logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ food_id: food.id, meal_type: mealType, quantity_g: qty }),
          });
        })
      );
      toast.success(
        `Logged ${checkedItems.length} item${checkedItems.length !== 1 ? "s" : ""}`
      );
      clearResults();
    } catch {
      toast.error("Failed to log some items");
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4 space-y-4">
      <h1 className="text-xl font-bold">Log Food</h1>

      {/* Camera */}
      {showCamera ? (
        <CameraView onFoodFound={handleFoodsFound} onClose={() => setShowCamera(false)} />
      ) : (
        <Button
          className="h-14 w-full bg-green-600 hover:bg-green-700 text-base"
          onClick={() => setShowCamera(true)}
        >
          <Camera className="mr-2 h-5 w-5" />
          Open Camera
        </Button>
      )}

      {!showCamera && (
        <p className="text-center text-sm text-muted-foreground -mt-2">
          Auto-detects barcodes · Identify food from photo
        </p>
      )}

      {/* Text search */}
      {!showCamera && (
        <>
          <div className="relative flex items-center">
            <div className="flex-1 border-t" />
            <span className="mx-3 text-xs text-muted-foreground">or search by text</span>
            <div className="flex-1 border-t" />
          </div>
          <FoodSearchBar onFoodsFound={handleFoodsFound} />
          <div className="relative flex items-center">
            <div className="flex-1 border-t" />
            <span className="mx-3 text-xs text-muted-foreground">or</span>
            <div className="flex-1 border-t" />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowManual(true)}
          >
            <PencilLine className="mr-2 h-4 w-4" />
            Manual Entry
          </Button>
          <ManualEntryDialog
            open={showManual}
            onOpenChange={setShowManual}
            onAdd={handleManualAdd}
          />
        </>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {results.length === 1 ? "1 item found" : `${results.length} items found`}
            </p>
            <button
              onClick={clearResults}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>

          {results.map((food) => {
            const key = getKey(food);
            const sel = selections[key];
            if (!sel) return null;

            return (
              <div
                key={key}
                className={cn(
                  "rounded-lg border transition-colors",
                  sel.checked
                    ? "border-green-400 bg-green-50/50 dark:bg-green-950/20"
                    : "border-border opacity-50"
                )}
              >
                {/* Main row */}
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleItem(key)}
                    className={cn(
                      "h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                      sel.checked
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-muted-foreground bg-background"
                    )}
                    aria-label={sel.checked ? "Deselect" : "Select"}
                  >
                    {sel.checked && <Check className="h-3 w-3" />}
                  </button>

                  {/* Food info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium capitalize">{food.name}</p>
                    {food.brand && (
                      <p className="truncate text-xs text-muted-foreground">{food.brand}</p>
                    )}
                    <div className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                      {food.calories_kcal != null && (
                        <span>{Math.round(food.calories_kcal)} kcal/100g</span>
                      )}
                      <span>P {food.protein_g ?? "—"}g</span>
                      <span>F {food.fat_g ?? "—"}g</span>
                      <span>C {food.carbs_g ?? "—"}g</span>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex shrink-0 items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      value={sel.quantity}
                      onChange={(e) => updateQuantity(key, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={!sel.checked}
                      className="w-16 rounded border bg-background px-2 py-1 text-center text-sm disabled:opacity-40"
                    />
                    <span className="text-xs text-muted-foreground">g</span>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpanded(key)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={sel.expanded ? "Hide nutrients" : "Edit nutrients"}
                  >
                    {sel.expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Expandable nutrient editor */}
                {sel.expanded && (
                  <div className="border-t px-3 pb-3 pt-2">
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Nutrients per 100g
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {NUTRIENT_FIELDS.map(({ key: field, label, unit }) => (
                        <div key={field} className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">
                            {label} ({unit})
                          </p>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={sel.nutrients[field]}
                            onChange={(e) => updateNutrient(key, field, e.target.value)}
                            className="w-full rounded border bg-background px-2 py-1 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    {sel.nutrientsEdited && (
                      <p className="mt-2 text-xs text-amber-600">
                        Edited values will be saved when you log.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Meal type + log button */}
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

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={clearResults} disabled={logging}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleBatchLog}
              disabled={logging || checkedItems.length === 0}
            >
              {logging
                ? "Logging…"
                : `Log ${checkedItems.length} item${checkedItems.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
