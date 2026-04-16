"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { calculateGoals, type TDEEInputs } from "@/lib/tdee";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<TDEEInputs>>({});

  const computed =
    form.age_years && form.weight_kg && form.height_cm && form.sex && form.activity_level && form.goal
      ? calculateGoals(form as TDEEInputs)
      : null;

  function set<K extends keyof TDEEInputs>(key: K, value: TDEEInputs[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.age_years || !form.weight_kg || !form.height_cm || !form.sex || !form.activity_level || !form.goal) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error } = await supabase
      .from("profiles")
      .update({ ...form, onboarding_complete: true })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-4 pt-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <span className="text-2xl">🥦</span>
          </div>
          <CardTitle>Set up your profile</CardTitle>
          <CardDescription>
            We&apos;ll calculate your daily nutrition targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="10"
                  max="100"
                  placeholder="25"
                  onChange={(e) => set("age_years", Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight">kg</Label>
                <Input
                  id="weight"
                  type="number"
                  min="30"
                  placeholder="70"
                  onChange={(e) => set("weight_kg", Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="height">cm</Label>
                <Input
                  id="height"
                  type="number"
                  min="100"
                  placeholder="175"
                  onChange={(e) => set("height_cm", Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sex</Label>
              <Select onValueChange={(v) => set("sex", v as TDEEInputs["sex"])}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Activity Level</Label>
              <Select onValueChange={(v) => set("activity_level", v as TDEEInputs["activity_level"])}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (desk job)</SelectItem>
                  <SelectItem value="light">Light (1–3x/week)</SelectItem>
                  <SelectItem value="moderate">Moderate (3–5x/week)</SelectItem>
                  <SelectItem value="active">Active (6–7x/week)</SelectItem>
                  <SelectItem value="very_active">Very Active</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Goal</Label>
              <Select onValueChange={(v) => set("goal", v as TDEEInputs["goal"])}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Lose weight</SelectItem>
                  <SelectItem value="maintain">Maintain weight</SelectItem>
                  <SelectItem value="gain">Gain muscle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {computed && (
              <div className="rounded-lg bg-green-50 p-3 text-sm dark:bg-green-950">
                <p className="font-semibold text-green-700 dark:text-green-300">Your daily targets</p>
                <p className="mt-0.5 text-green-600 dark:text-green-400">
                  🔥 {computed.calories} kcal · 🥩 {computed.protein_g}g protein ·{" "}
                  🧈 {computed.fat_g}g fat · 🍞 {computed.carbs_g}g carbs
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !computed}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? "Saving…" : "Get Started"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
