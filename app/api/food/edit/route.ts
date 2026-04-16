import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, calories_kcal, protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg } = body;
  if (!id) return NextResponse.json({ error: "Missing food id" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (calories_kcal != null) updates.calories_kcal = calories_kcal;
  if (protein_g != null) updates.protein_g = protein_g;
  if (fat_g != null) updates.fat_g = fat_g;
  if (carbs_g != null) updates.carbs_g = carbs_g;
  if (fiber_g != null) updates.fiber_g = fiber_g;
  if (sugar_g != null) updates.sugar_g = sugar_g;
  if (sodium_mg != null) updates.sodium_mg = sodium_mg;

  const service = createServiceClient();
  const { error } = await service.from("foods").update(updates).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
