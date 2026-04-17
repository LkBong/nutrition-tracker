export function getMealTypeFromHour(hour: number): "breakfast" | "lunch" | "dinner" | "snack" {
  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 12 && hour < 14) return "lunch";
  if (hour >= 19 && hour < 21) return "dinner";
  return "snack";
}
