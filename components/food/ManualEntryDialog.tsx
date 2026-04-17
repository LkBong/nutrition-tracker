"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FoodItem } from "./FoodResultCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (food: FoodItem, quantity_g: number) => void;
}

const OPTIONAL_FIELDS: { key: string; label: string; unit: string }[] = [
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fiber_g", label: "Fiber", unit: "g" },
  { key: "sugar_g", label: "Sugar", unit: "g" },
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
];

const empty = () => ({
  name: "",
  quantity_g: "",
  calories_kcal: "",
  protein_g: "",
  fat_g: "",
  carbs_g: "",
  fiber_g: "",
  sugar_g: "",
  sodium_mg: "",
});

export default function ManualEntryDialog({ open, onOpenChange, onAdd }: Props) {
  const [fields, setFields] = useState(empty);
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setFields(empty());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.name.trim()) return;
    const qty = parseFloat(fields.quantity_g);
    if (!qty || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    if (!fields.calories_kcal) {
      toast.error("Calories are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/food/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error("Failed");
      const food: FoodItem = await res.json();
      onAdd(food, qty);
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Could not save food. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label htmlFor="me-name">Food name *</Label>
            <Input
              id="me-name"
              placeholder="e.g. Chicken breast"
              value={fields.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="me-qty">Quantity (g) *</Label>
              <Input
                id="me-qty"
                type="number"
                min="1"
                step="1"
                placeholder="150"
                value={fields.quantity_g}
                onChange={(e) => set("quantity_g", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="me-cal">Calories (kcal) *</Label>
              <Input
                id="me-cal"
                type="number"
                min="0"
                step="1"
                placeholder="248"
                value={fields.calories_kcal}
                onChange={(e) => set("calories_kcal", e.target.value)}
                required
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Optional — values for the quantity above
          </p>

          <div className="grid grid-cols-2 gap-3">
            {OPTIONAL_FIELDS.map(({ key, label, unit }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`me-${key}`}>
                  {label} ({unit})
                </Label>
                <Input
                  id={`me-${key}`}
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="—"
                  value={(fields as Record<string, string>)[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to log"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
