// USDA FoodData Central. Key gratis: https://api.data.gov/signup — 1,000 req/hora.
import type { Food } from './types';

const BASE = 'https://api.nal.usda.gov/fdc/v1';
const KEY = process.env.EXPO_PUBLIC_USDA_KEY!;

// IDs de nutriente USDA -> nuestros campos
const N = { kcal: 1008, protein: 1003, fat: 1004, carbs: 1005, fiber: 1079 };

function pick(nutrients: any[], id: number): number {
  // search devuelve nutrientId, /food/{id} devuelve nutrient.id
  const n = nutrients?.find(
    (x) => x.nutrientId === id || x.nutrient?.id === id
  );
  return Number(n?.value ?? n?.amount ?? 0);
}

export async function searchUSDA(query: string): Promise<Food[]> {
  const url =
    `${BASE}/foods/search?api_key=${KEY}` +
    `&query=${encodeURIComponent(query)}` +
    `&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)&pageSize=20`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const json = await res.json();

  return (json.foods ?? []).map((f: any) => ({
    source: 'usda' as const,
    source_id: String(f.fdcId),
    name: f.description,
    brand: f.brandOwner ?? null,
    // USDA entrega todo por 100 g en estos dataTypes
    kcal: pick(f.foodNutrients, N.kcal),
    protein: pick(f.foodNutrients, N.protein),
    carbs: pick(f.foodNutrients, N.carbs),
    fat: pick(f.foodNutrients, N.fat),
    fiber: pick(f.foodNutrients, N.fiber),
    serving_g: 100,
  })).filter((f: Food) => f.kcal > 0);
}
