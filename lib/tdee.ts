export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface TDEEInputs {
  age_years: number;
  weight_kg: number;
  height_cm: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal: Goal;
}

export interface NutritionGoals {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

/** Mifflin-St Jeor BMR formula */
function calculateBMR(inputs: TDEEInputs): number {
  const { weight_kg, height_cm, age_years, sex } = inputs;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age_years;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateGoals(inputs: TDEEInputs): NutritionGoals {
  const bmr = calculateBMR(inputs);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[inputs.activity_level];

  const calories =
    inputs.goal === "lose"
      ? Math.round(tdee - 500)
      : inputs.goal === "gain"
      ? Math.round(tdee + 300)
      : Math.round(tdee);

  // Macro split: protein 30%, fat 25%, carbs 45%
  const protein_g = Math.round((calories * 0.3) / 4);
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.round((calories * 0.45) / 4);

  return { calories, protein_g, fat_g, carbs_g };
}
