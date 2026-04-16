"use client";

import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Profile {
  age_years: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  sex: string | null;
  activity_level: string | null;
  goal: string | null;
  calorie_goal_override: number | null;
  protein_goal_g_override: number | null;
  fat_goal_g_override: number | null;
  carbs_goal_g_override: number | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({
    age_years: null, weight_kg: null, height_cm: null,
    sex: null, activity_level: null, goal: null,
    calorie_goal_override: null, protein_goal_g_override: null,
    fat_goal_g_override: null, carbs_goal_g_override: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  const computed =
    profile.age_years && profile.weight_kg && profile.height_cm && profile.sex && profile.activity_level && profile.goal
      ? calculateGoals({
          age_years: profile.age_years,
          weight_kg: profile.weight_kg,
          height_cm: profile.height_cm,
          sex: profile.sex as TDEEInputs["sex"],
          activity_level: profile.activity_level as TDEEInputs["activity_level"],
          goal: profile.goal as TDEEInputs["goal"],
        })
      : null;

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Settings saved");
    }
    setSaving(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function field(label: string, key: keyof Profile, type = "number") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          type={type}
          value={(profile[key] as string | number) ?? ""}
          onChange={(e) =>
            setProfile((p) => ({
              ...p,
              [key]: e.target.value === "" ? null : type === "number" ? Number(e.target.value) : e.target.value,
            }))
          }
          placeholder="—"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Body profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Body Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {field("Age", "age_years")}
            {field("Weight (kg)", "weight_kg")}
            {field("Height (cm)", "height_cm")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sex</Label>
              <Select
                value={profile.sex ?? ""}
                onValueChange={(v) => setProfile((p) => ({ ...p, sex: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Goal</Label>
              <Select
                value={profile.goal ?? ""}
                onValueChange={(v) => setProfile((p) => ({ ...p, goal: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Lose weight</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                  <SelectItem value="gain">Gain muscle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Activity Level</Label>
            <Select
              value={profile.activity_level ?? ""}
              onValueChange={(v) => setProfile((p) => ({ ...p, activity_level: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary (desk job, no exercise)</SelectItem>
                <SelectItem value="light">Light (1–3 days/week)</SelectItem>
                <SelectItem value="moderate">Moderate (3–5 days/week)</SelectItem>
                <SelectItem value="active">Active (6–7 days/week)</SelectItem>
                <SelectItem value="very_active">Very Active (athlete)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {computed && (
            <div className="rounded-lg bg-green-50 p-3 text-sm dark:bg-green-950">
              <p className="font-medium text-green-700 dark:text-green-300">
                Calculated targets
              </p>
              <p className="mt-0.5 text-green-600 dark:text-green-400">
                {computed.calories} kcal · P {computed.protein_g}g · F {computed.fat_g}g · C {computed.carbs_g}g
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual overrides */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Manual Goal Overrides</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {field("Calories (kcal)", "calorie_goal_override")}
          {field("Protein (g)", "protein_goal_g_override")}
          {field("Fat (g)", "fat_goal_g_override")}
          {field("Carbs (g)", "carbs_goal_g_override")}
        </CardContent>
      </Card>

      <Button
        onClick={save}
        disabled={saving}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {saving ? "Saving…" : "Save Settings"}
      </Button>

      <Separator />

      <Button variant="outline" onClick={signOut} className="w-full">
        Sign Out
      </Button>
    </div>
  );
}
