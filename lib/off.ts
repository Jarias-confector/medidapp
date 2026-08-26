// Open Food Facts. Sin API key. OJO: responde HTTP 200 con status:0 si no existe.
import type { Food } from './types';

const UA = 'MacrosMX/1.0 (contacto@tudominio.com)'; // OFF exige User-Agent descriptivo

export async function lookupBarcode(barcode: string): Promise<Food | null> {
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json` +
    `?fields=product_name,product_name_es,brands,nutriments,serving_quantity`;

  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;

  const json = await res.json();
  if (json.status !== 1 || !json.product) return null; // <- la trampa

  const n = json.product.nutriments ?? {};
  const kcal = Number(n['energy-kcal_100g'] ?? 0);
  if (!kcal) return null; // producto sin panel nutricional

  return {
    source: 'off',
    source_id: barcode,
    name: json.product.product_name_es || json.product.product_name || barcode,
    brand: json.product.brands ?? null,
    kcal,
    protein: Number(n.proteins_100g ?? 0),
    carbs: Number(n.carbohydrates_100g ?? 0),
    fat: Number(n.fat_100g ?? 0),
    fiber: Number(n.fiber_100g ?? 0),
    serving_g: Number(json.product.serving_quantity) || 100,
  };
}

export async function searchOFF(query: string): Promise<Food[]> {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1` +
    `&fields=product_name,product_name_es,brands,nutriments,serving_quantity,code`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];

    const json = await res.json();
    const products = json.products ?? [];

    return products
      .map((p: any) => {
        const n = p.nutriments ?? {};
        const kcal = Number(n['energy-kcal_100g'] ?? 0);
        return {
          source: 'off' as const,
          source_id: p.code || String(Math.random()),
          name: p.product_name_es || p.product_name || 'Alimento desconocido',
          brand: p.brands ?? null,
          kcal,
          protein: Number(n.proteins_100g ?? 0),
          carbs: Number(n.carbohydrates_100g ?? 0),
          fat: Number(n.fat_100g ?? 0),
          fiber: Number(n.fiber_100g ?? 0),
          serving_g: Number(p.serving_quantity) || 100,
        };
      })
      .filter((f: Food) => f.kcal > 0);
  } catch {
    return [];
  }
}
