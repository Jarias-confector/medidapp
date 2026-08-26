import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Food, Entry, Macros, Meal } from './types';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // En nativo no hay URL que leer: el deep link se procesa a mano en _layout.
      detectSessionInUrl: false,
      // PKCE devuelve ?code=... como query param, fácil de sacar del deep link.
      flowType: 'pkce',
    },
  }
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

  const savedFood = data as Food;
  await AsyncStorage.setItem(`food:${savedFood.id}`, JSON.stringify(savedFood));
  return savedFood;
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

export async function addEntry(foodId: string, grams: number, meal: Meal, eatenAt?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const record = {
    user_id: user!.id,
    food_id: foodId,
    grams,
    meal,
    eaten_at: eatenAt || new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('entries').insert(record);
    if (error) throw error;

    const dateStr = record.eaten_at.slice(0, 10);
    await AsyncStorage.removeItem(`entries:${dateStr}`);
  } catch (err) {
    console.warn('Failed to insert entry in Supabase, queuing offline:', err);
    const queueStr = await AsyncStorage.getItem('offline_entries_queue');
    const queue = queueStr ? JSON.parse(queueStr) : [];
    queue.push(record);
    await AsyncStorage.setItem('offline_entries_queue', JSON.stringify(queue));

    // Guardar en caché del día para visualización optimista offline
    const dateStr = record.eaten_at.slice(0, 10);
    const cachedStr = await AsyncStorage.getItem(`entries:${dateStr}`);
    const cachedEntries: Entry[] = cachedStr ? JSON.parse(cachedStr) : [];

    const cachedFoodStr = await AsyncStorage.getItem(`food:${foodId}`);
    const foodDetails = cachedFoodStr ? JSON.parse(cachedFoodStr) : null;

    const tempEntry: Entry = {
      id: 'temp_' + Math.random().toString(36).substring(2, 9),
      user_id: record.user_id,
      food_id: record.food_id,
      grams: record.grams,
      meal: record.meal,
      eaten_at: record.eaten_at,
      created_at: new Date().toISOString(),
      foods: foodDetails || { id: foodId, name: 'Alimento (offline)', kcal: 0, protein: 0, carbs: 0, fat: 0, source: 'custom' },
    };
    cachedEntries.push(tempEntry);
    await AsyncStorage.setItem(`entries:${dateStr}`, JSON.stringify(cachedEntries));
  }
}

export async function deleteEntry(id: string, date: string) {
  try {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) throw error;
    await AsyncStorage.removeItem(`entries:${date}`);
  } catch (err) {
    console.warn('Delete failed, removing from local cache:', err);
    const cacheKey = `entries:${date}`;
    const cachedStr = await AsyncStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached: Entry[] = JSON.parse(cachedStr);
      const filtered = cached.filter((e) => e.id !== id);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(filtered));
    }
  }
}

export async function dayEntries(date: string): Promise<Entry[]> {
  const cacheKey = `entries:${date}`;
  try {
    const { data, error } = await supabase
      .from('entries')
      .select('*, foods(*)')
      .gte('eaten_at', `${date}T00:00:00`)
      .lte('eaten_at', `${date}T23:59:59`)
      .order('eaten_at', { ascending: true });
    
    if (error) throw error;
    const entries = (data ?? []) as Entry[];
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entries));
    return entries;
  } catch (err) {
    console.warn('dayEntries query failed, loading local cache:', err);
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  }
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
  const cacheKey = 'goals:current';
  try {
    const { data, error } = await supabase.from('goals').select('*').maybeSingle();
    if (error) throw error;
    const goals = data ?? { kcal: 2000, protein: 150, carbs: 200, fat: 65 };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(goals));
    return goals;
  } catch (err) {
    console.warn('getGoals failed, loading local cache:', err);
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : { kcal: 2000, protein: 150, carbs: 200, fat: 65 };
  }
}

export async function saveGoals(goals: Macros) {
  const cacheKey = 'goals:current';
  await AsyncStorage.setItem(cacheKey, JSON.stringify(goals));
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('goals').upsert({
    user_id: user!.id,
    kcal: goals.kcal,
    protein: goals.protein,
    carbs: goals.carbs,
    fat: goals.fat,
  });
  if (error) throw error;
}

export async function syncOfflineQueue() {
  try {
    const queueStr = await AsyncStorage.getItem('offline_entries_queue');
    if (!queueStr) return;
    const queue = JSON.parse(queueStr);
    if (queue.length === 0) return;

    console.log(`Sincronizando ${queue.length} entradas registradas offline...`);
    const successfulIndexes: number[] = [];

    for (let i = 0; i < queue.length; i++) {
      const record = queue[i];
      try {
        const { error } = await supabase.from('entries').insert({
          user_id: record.user_id,
          food_id: record.food_id,
          grams: record.grams,
          meal: record.meal,
          eaten_at: record.eaten_at,
        });
        if (!error) {
          successfulIndexes.push(i);
          const dateStr = record.eaten_at.slice(0, 10);
          await AsyncStorage.removeItem(`entries:${dateStr}`);
        }
      } catch (err) {
        console.warn('Error syncing queued entry:', err);
        break;
      }
    }

    const remainingQueue = queue.filter((_: any, idx: number) => !successfulIndexes.includes(idx));
    if (remainingQueue.length > 0) {
      await AsyncStorage.setItem('offline_entries_queue', JSON.stringify(remainingQueue));
    } else {
      await AsyncStorage.removeItem('offline_entries_queue');
    }
  } catch (err) {
    console.error('Error syncing queue:', err);
  }
}
