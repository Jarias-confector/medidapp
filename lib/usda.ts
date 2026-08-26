// USDA FoodData Central vía Edge Function. La API key vive en Supabase, no aquí.
import { supabase } from './db';
import type { Food } from './types';

// IDs de nutriente USDA -> nuestros campos
const N = { kcal: 1008, protein: 1003, fat: 1004, carbs: 1005, fiber: 1079 };

function pick(nutrients: any[], id: number): number {
  // search devuelve nutrientId, /food/{id} devuelve nutrient.id
  const n = nutrients?.find(
    (x) => x.nutrientId === id || x.nutrient?.id === id
  );
  return Number(n?.value ?? n?.amount ?? 0);
}

/** Lee el mensaje en español que devuelve la función cuando responde con error. */
async function messageFrom(error: any): Promise<string> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch {
    // el cuerpo no era JSON; usamos el mensaje genérico
  }
  return 'No se pudo buscar en USDA. Intenta de nuevo.';
}

export async function searchUSDA(query: string): Promise<Food[]> {
  const { data, error } = await supabase.functions.invoke('search-food', {
    body: { q: query },
  });

  if (error) throw new Error(await messageFrom(error));
  if (data?.error) throw new Error(String(data.error));

  return ((data?.foods ?? []) as any[])
    .map((f: any) => ({
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
    }))
    .filter((f: Food) => f.kcal > 0);
}
