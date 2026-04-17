import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("food_logs")
    .select("foods(*)")
    .eq("user_id", user.id)
    .ilike("foods.name", `%${q.trim()}%`)
    .order("logged_at", { ascending: false })
    .limit(40);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate by food id, preserving most-recent-first order
  const seen = new Set<string>();
  const unique = (data ?? [])
    .map((row) => row.foods)
    .filter((f): f is NonNullable<typeof f> => !!f && !seen.has((f as { id: string }).id) && seen.add((f as { id: string }).id) === undefined)
    .slice(0, 8);

  return NextResponse.json(unique);
}
