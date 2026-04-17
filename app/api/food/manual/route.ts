import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, quantity_g, calories_kcal, protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const qty = parseFloat(quantity_g);
  if (!qty || qty <= 0) {
    return NextResponse.json({ error: "quantity_g must be a positive number" }, { status: 400 });
  }

  const scale = (v: unknown) => {
    const n = parseFloat(v as string);
    return isNaN(n) ? null : Math.round((n / qty) * 1000) / 10;
  };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("foods")
    .insert({
      name: name.trim(),
      calories_kcal: scale(calories_kcal),
      protein_g: scale(protein_g),
      fat_g: scale(fat_g),
      carbs_g: scale(carbs_g),
      fiber_g: scale(fiber_g),
      sugar_g: scale(sugar_g),
      sodium_mg: scale(sodium_mg),
      source: "manual",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ...data, serving_size_g: qty });
}
