import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Food, Entry, Macros, Meal } from './types';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: AsyncStorage, persistSession: true, detectSessionInUrl: false } }
);

/** Guarda un Food externo en cache y devuelve el row con id. Idempotente. */
export async function cacheFood(food: Food): Promise<Food> {
  const { data, error } = await supabase
    .from('foods')
    .upsert(
      {
        source: food.source,
        source_id: food.source_id,
        name: food.name,
        brand: food.brand ?? null,
        kcal: food.kcal,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber ?? null,
        serving_g: food.serving_g ?? 100,
      },
      { onConflict: 'source,source_id', ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Food;
}

/** Busca primero en cache local. Solo pega a USDA si hay pocos resultados. */
export async function searchCache(q: string): Promise<Food[]> {
  const { data } = await supabase
    .from('foods')
    .select('*')
    .ilike('name', `%${q}%`)
    .limit(20);
  return (data ?? []) as Food[];
}

export async function addEntry(foodId: string, grams: number, meal: Meal) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('entries').insert({
    user_id: user!.id, food_id: foodId, grams, meal,
  });
  if (error) throw error;
}

export async function deleteEntry(id: string) {
  await supabase.from('entries').delete().eq('id', id);
}

export async function dayEntries(date: string): Promise<Entry[]> {
  const { data } = await supabase
    .from('entries')
    .select('*, foods(*)')
    .gte('eaten_at', `${date}T00:00:00`)
    .lte('eaten_at', `${date}T23:59:59`)
    .order('eaten_at', { ascending: true });
  return (data ?? []) as Entry[];
}

export function sumMacros(entries: Entry[]): Macros {
  return entries.reduce(
    (acc, e) => {
      const f = e.foods!;
      const k = e.grams / 100;
      return {
        kcal: acc.kcal + f.kcal * k,
        protein: acc.protein + f.protein * k,
        carbs: acc.carbs + f.carbs * k,
        fat: acc.fat + f.fat * k,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export async function getGoals(): Promise<Macros> {
  const { data } = await supabase.from('goals').select('*').maybeSingle();
  return data ?? { kcal: 2000, protein: 150, carbs: 200, fat: 65 };
}
