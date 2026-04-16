"use client";

import { useState } from "react";
import { Camera, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CameraView from "@/components/camera/CameraView";
import FoodSearchBar from "@/components/food/FoodSearchBar";
import FoodResultCard, { type FoodItem } from "@/components/food/FoodResultCard";
import PortionSelector from "@/components/food/PortionSelector";

type Step = "scan" | "confirm" | "done";

export default function LogPage() {
  const [step, setStep] = useState<Step>("scan");
  const [showCamera, setShowCamera] = useState(false);
  const [pendingFoods, setPendingFoods] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  function handleFoodsFound(foods: FoodItem[]) {
    setShowCamera(false);
    if (foods.length === 1) {
      setSelectedFood(foods[0]);
      setStep("confirm");
    } else {
      setPendingFoods(foods);
      setStep("confirm");
    }
  }

  function handleFoodSelected(food: FoodItem) {
    setSelectedFood(food);
    setPendingFoods([]);
  }

  function reset() {
    setStep("scan");
    setShowCamera(false);
    setSelectedFood(null);
    setPendingFoods([]);
  }

  if (step === "confirm" && selectedFood) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <h1 className="mb-4 text-xl font-bold">Confirm Portion</h1>
        <PortionSelector
          food={selectedFood}
          onLogged={reset}
          onCancel={() => {
            setSelectedFood(null);
            setStep("scan");
          }}
        />
      </div>
    );
  }

  if (step === "confirm" && pendingFoods.length > 0) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <h1 className="mb-4 text-xl font-bold">Select Food</h1>
        <p className="mb-3 text-sm text-muted-foreground">Multiple items detected. Select one to log:</p>
        <div className="space-y-2">
          {pendingFoods.map((food) => (
            <FoodResultCard key={food.id ?? food.name} food={food} onSelect={handleFoodSelected} />
          ))}
        </div>
        <Button variant="outline" className="mt-3 w-full" onClick={reset}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-4 text-xl font-bold">Log Food</h1>

      {showCamera ? (
        <CameraView onFoodFound={handleFoodsFound} onClose={() => setShowCamera(false)} />
      ) : (
        <div className="space-y-4">
          <Button
            className="h-14 w-full bg-green-600 hover:bg-green-700 text-base"
            onClick={() => setShowCamera(true)}
          >
            <Camera className="mr-2 h-5 w-5" />
            Open Camera
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Auto-detects barcodes · Identify food from photo
          </p>

          <div className="relative flex items-center py-2">
            <div className="flex-1 border-t" />
            <span className="mx-3 text-xs text-muted-foreground">or search by text</span>
            <div className="flex-1 border-t" />
          </div>

          <FoodSearchBar onFoodSelected={(food) => {
            setSelectedFood(food);
            setStep("confirm");
          }} />
        </div>
      )}
    </div>
  );
}
