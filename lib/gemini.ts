import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NutrientsPer100g } from "./nutrients";

export interface NormalizedFoodItem {
  name: string;
  serving_size_g: number;
  per100g: NutrientsPer100g;
}

interface GeminiItem {
  name: string;
  estimated_weight_g?: number;
  serving_g?: number;
  calories_kcal_per100g: number;
  protein_g_per100g: number;
  fat_g_per100g: number;
  carbs_g_per100g: number;
  fiber_g_per100g?: number;
  sugar_g_per100g?: number;
  sodium_mg_per100g?: number;
}

const NUTRITION_JSON_SCHEMA = `{
  "items": [
    {
      "name": "<food name, lowercase>",
      "estimated_weight_g": <number — typical single serving weight in grams>,
      "calories_kcal_per100g": <number>,
      "protein_g_per100g": <number>,
      "fat_g_per100g": <number>,
      "carbs_g_per100g": <number>,
      "fiber_g_per100g": <number>,
      "sugar_g_per100g": <number>,
      "sodium_mg_per100g": <number>
    }
  ]
}`;

const TEXT_PROMPT = (query: string) =>
  `You are a precise nutrition database. Return nutritional data per 100g for every distinct food item mentioned in this query: "${query}"

Rules:
- Use standard nutritional values from established databases (USDA etc.)
- If a quantity is given (e.g. "2 eggs"), use the total weight for estimated_weight_g
- Return ONLY valid JSON, no markdown, no explanation
- Include all items even if uncertain — use best estimates

Return this exact JSON structure:
${NUTRITION_JSON_SCHEMA}`;

const IMAGE_PROMPT = `You are a food identification and nutrition assistant. Analyse this image and identify every visible food item.

Rules:
- Estimate the weight of each portion based on visual cues (plate size, typical serving)
- Use standard nutritional values per 100g from established databases
- Return ONLY valid JSON, no markdown, no explanation
- If multiple items visible, list each separately

Return this exact JSON structure:
${NUTRITION_JSON_SCHEMA}`;

function getModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

function parseGeminiResponse(text: string): NormalizedFoodItem[] {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\n?/g, "").trim();

  let parsed: { items: GeminiItem[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  if (!parsed.items?.length) return [];

  return parsed.items.map((item) => ({
    name: item.name,
    serving_size_g: item.estimated_weight_g ?? item.serving_g ?? 100,
    per100g: {
      calories_kcal: round(item.calories_kcal_per100g),
      protein_g: round(item.protein_g_per100g),
      fat_g: round(item.fat_g_per100g),
      carbs_g: round(item.carbs_g_per100g),
      fiber_g: item.fiber_g_per100g != null ? round(item.fiber_g_per100g) : null,
      sugar_g: item.sugar_g_per100g != null ? round(item.sugar_g_per100g) : null,
      sodium_mg: item.sodium_mg_per100g != null ? round(item.sodium_mg_per100g) : null,
    },
  }));
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Natural language text query → nutrition per 100g for each item */
export async function searchByText(query: string): Promise<NormalizedFoodItem[]> {
  const model = getModel();
  const result = await model.generateContent(TEXT_PROMPT(query));
  return parseGeminiResponse(result.response.text());
}

/** Image file → identify foods → nutrition per 100g for each */
export async function searchByImage(file: File): Promise<NormalizedFoodItem[]> {
  const model = getModel();

  // Convert file to base64
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const imagePart = {
    inlineData: {
      data: base64,
      mimeType: file.type || "image/jpeg",
    },
  };

  const result = await model.generateContent([IMAGE_PROMPT, imagePart]);
  return parseGeminiResponse(result.response.text());
}
