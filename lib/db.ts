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
  let savedFood: Food | null = null;
  
  try {
    // 1. Intentar buscar si ya existe para evitar upsert (evitando requerir política de UPDATE en RLS)
    const { data: existing, error: selectErr } = await supabase
      .from('foods')
      .select('*')
      .eq('source', food.source)
      .eq('source_id', food.source_id)
      .maybeSingle();

    if (!selectErr && existing) {
      savedFood = existing as Food;
    } else {
      // 2. Si no existe, hacer un INSERT simple (solo requiere política de INSERT)
      const { data: { user } } = await supabase.auth.getUser();
      const insertData: any = {
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
      };

      if (food.source === 'custom' && user) {
        insertData.owner_id = user.id;
      }

      const { data, error: insertErr } = await supabase
        .from('foods')
        .insert(insertData)
        .select()
        .single();
        
      if (insertErr) throw insertErr;
      savedFood = data as Food;
    }
  } catch (err) {
    console.warn('Failed to insert food in Supabase, saving locally:', err);
    savedFood = {
      ...food,
      id: food.id || 'loc_' + Math.random().toString(36).substring(2, 11),
      brand: food.brand ?? 'Receta casera (Local)',
    };
    
    const queueStr = await AsyncStorage.getItem('offline_foods_queue');
    const queue = queueStr ? JSON.parse(queueStr) : [];
    queue.push(savedFood);
    await AsyncStorage.setItem('offline_foods_queue', JSON.stringify(queue));
  }

  await AsyncStorage.setItem(`food:${savedFood.id}`, JSON.stringify(savedFood));

  const customStr = await AsyncStorage.getItem('custom_foods_list');
  const customList: Food[] = customStr ? JSON.parse(customStr) : [];
  const exists = customList.some((f) => f.source === savedFood!.source && f.source_id === savedFood!.source_id);
  if (!exists) {
    customList.push(savedFood);
    await AsyncStorage.setItem('custom_foods_list', JSON.stringify(customList));
  }

  return savedFood;
}

/** Busca primero en cache local. Solo pega a USDA si hay pocos resultados. */
export async function searchCache(q: string): Promise<Food[]> {
  const query = q.toLowerCase().trim();
  let dbResults: Food[] = [];
  
  try {
    const { data } = await supabase
      .from('foods')
      .select('*')
      .ilike('name', `%${q}%`)
      .limit(20);
    dbResults = (data ?? []) as Food[];
  } catch (err) {
    console.warn('searchCache remote failed:', err);
  }

  let localCustoms: Food[] = [];
  try {
    const customStr = await AsyncStorage.getItem('custom_foods_list');
    if (customStr) {
      const allCustoms: Food[] = JSON.parse(customStr);
      localCustoms = allCustoms.filter((f) => f.name.toLowerCase().includes(query));
    }
  } catch (err) {
    console.warn('Failed to load custom foods from AsyncStorage:', err);
  }

  const merged = [...dbResults];
  const seenIds = new Set(dbResults.map((f) => f.id || `${f.source}:${f.source_id}`));
  for (const f of localCustoms) {
    const key = f.id || `${f.source}:${f.source_id}`;
    if (!seenIds.has(key)) {
      merged.push(f);
      seenIds.add(key);
    }
  }

  return merged;
}

export async function addEntry(foodId: string, grams: number, meal: Meal, eatenAt?: string) {
  const eatenAtStr = eatenAt || new Date().toISOString();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No active user session');

    const record = {
      user_id: user.id,
      food_id: foodId,
      grams,
      meal,
      eaten_at: eatenAtStr,
    };

    const { error } = await supabase.from('entries').insert(record);
    if (error) throw error;

    const dateStr = eatenAtStr.slice(0, 10);
    await AsyncStorage.removeItem(`entries:${dateStr}`);
  } catch (err) {
    console.warn('Failed to insert entry in Supabase, queuing offline:', err);
    
    let userId = 'offline_user';
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) userId = data.user.id;
    } catch {}

    const record = {
      user_id: userId,
      food_id: foodId,
      grams,
      meal,
      eaten_at: eatenAtStr,
    };

    const queueStr = await AsyncStorage.getItem('offline_entries_queue');
    const queue = queueStr ? JSON.parse(queueStr) : [];
    queue.push(record);
    await AsyncStorage.setItem('offline_entries_queue', JSON.stringify(queue));

    // Guardar en caché del día para visualización optimista offline
    const dateStr = eatenAtStr.slice(0, 10);
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
export async function deleteCustomFood(id: string) {
  try {
    const { error } = await supabase.from('foods').delete().eq('id', id);
    if (error) {
      console.warn('Could not delete food from remote DB (might be in use):', error.message);
    }
  } catch (err) {
    console.warn('Failed to delete food from remote DB:', err);
  }

  await AsyncStorage.removeItem(`food:${id}`);

  try {
    const customStr = await AsyncStorage.getItem('custom_foods_list');
    if (customStr) {
      const customList: Food[] = JSON.parse(customStr);
      const filtered = customList.filter((f) => f.id !== id);
      await AsyncStorage.setItem('custom_foods_list', JSON.stringify(filtered));
    }
  } catch (err) {
    console.warn('Failed to remove custom food from list:', err);
  }

  try {
    const queueStr = await AsyncStorage.getItem('offline_foods_queue');
    if (queueStr) {
      const queue: Food[] = JSON.parse(queueStr);
      const filtered = queue.filter((f) => f.id !== id);
      await AsyncStorage.setItem('offline_foods_queue', JSON.stringify(filtered));
    }
  } catch {}
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
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No active user session');

    const { error } = await supabase.from('goals').upsert({
      user_id: user.id,
      kcal: goals.kcal,
      protein: goals.protein,
      carbs: goals.carbs,
      fat: goals.fat,
    });
    if (error) throw error;
  } catch (err) {
    console.warn('saveGoals failed, saving pending offline goals:', err);
    await AsyncStorage.setItem('offline_goals_pending', JSON.stringify(goals));
  }
}

export async function syncOfflineQueue() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const activeUserId = user?.id;

    // 1. Sincronizar alimentos creados offline
    const foodsQueueStr = await AsyncStorage.getItem('offline_foods_queue');
    const idMapping: { [tempId: string]: string } = {};

    if (foodsQueueStr) {
      const foodsQueue: Food[] = JSON.parse(foodsQueueStr);
      const successfulFoodIndexes: number[] = [];

      for (let i = 0; i < foodsQueue.length; i++) {
        const food = foodsQueue[i];
        try {
          // Intentar insertar de forma segura
          const { data, error } = await supabase
            .from('foods')
            .insert({
              source: food.source,
              source_id: food.source_id,
              name: food.name,
              brand: food.brand,
              kcal: food.kcal,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
              fiber: food.fiber,
              serving_g: food.serving_g,
              owner_id: activeUserId || null,
            })
            .select()
            .single();

          if (!error && data) {
            successfulFoodIndexes.push(i);
            const realId = data.id;
            idMapping[food.id!] = realId;
            
            await AsyncStorage.setItem(`food:${realId}`, JSON.stringify(data));
            await AsyncStorage.removeItem(`food:${food.id}`);
          } else if (error && error.code === '23505') {
            // Duplicado en source,source_id: ya existe en Supabase. Intentamos obtener el ID real.
            const { data: existing } = await supabase
              .from('foods')
              .select('id')
              .eq('source', food.source)
              .eq('source_id', food.source_id)
              .maybeSingle();
            
            if (existing) {
              successfulFoodIndexes.push(i);
              idMapping[food.id!] = existing.id;
              await AsyncStorage.removeItem(`food:${food.id}`);
            }
          }
        } catch (err) {
          console.warn('Error syncing queued food:', err);
          break;
        }
      }

      const remainingFoodsQueue = foodsQueue.filter((_: any, idx: number) => !successfulFoodIndexes.includes(idx));
      if (remainingFoodsQueue.length > 0) {
        await AsyncStorage.setItem('offline_foods_queue', JSON.stringify(remainingFoodsQueue));
      } else {
        await AsyncStorage.removeItem('offline_foods_queue');
      }
    }

    // 2. Sincronizar entradas registradas offline
    const queueStr = await AsyncStorage.getItem('offline_entries_queue');
    if (queueStr) {
      const queue = JSON.parse(queueStr);
      if (queue.length > 0) {
        console.log(`Sincronizando ${queue.length} entradas registradas offline...`);
        const successfulIndexes: number[] = [];

        for (let i = 0; i < queue.length; i++) {
          const record = queue[i];
          let foodId = record.food_id;
          if (idMapping[foodId]) {
            foodId = idMapping[foodId];
          }

          if (String(foodId).startsWith('loc_')) {
            continue;
          }

          const userId = (!record.user_id || record.user_id === 'offline_user') ? activeUserId : record.user_id;
          if (!userId) continue;

          try {
            const { error } = await supabase.from('entries').insert({
              user_id: userId,
              food_id: foodId,
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
      }
    }

    // 3. Sincronizar metas pendientes creadas offline
    const pendingGoalsStr = await AsyncStorage.getItem('offline_goals_pending');
    if (pendingGoalsStr && activeUserId) {
      const pendingGoals = JSON.parse(pendingGoalsStr);
      try {
        const { error } = await supabase.from('goals').upsert({
          user_id: activeUserId,
          kcal: pendingGoals.kcal,
          protein: pendingGoals.protein,
          carbs: pendingGoals.carbs,
          fat: pendingGoals.fat,
        });
        if (!error) {
          await AsyncStorage.removeItem('offline_goals_pending');
        }
      } catch (err) {
        console.warn('Error syncing queued goals:', err);
      }
    }
  } catch (err) {
    console.error('Error syncing queue:', err);
  }
}
