import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { searchCache, cacheFood, deleteCustomFood } from '../lib/db';
import { searchUSDA } from '../lib/usda';
import { searchOFF } from '../lib/off';
import { searchBasics } from '../lib/basics';
import type { Food } from '../lib/types';
import { T } from '../lib/theme';

export default function Search() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();

  async function run() {
    if (q.trim().length < 2) return;
    setBusy(true); setErr('');
    try {
      // 1. Alimentos básicos locales (instantáneos y sin key)
      const basics = searchBasics(q);

      // 2. cache local (gratis, instantáneo)
      const local = await searchCache(q);

      // Combinar básicos y locales únicos
      const initialResults = [...basics];
      const seen = new Set(basics.map((f) => `${f.source}:${f.source_id}`));
      for (const f of local) {
        const key = `${f.source}:${f.source_id}`;
        if (!seen.has(key)) {
          initialResults.push(f);
          seen.add(key);
        }
      }
      setResults(initialResults);
      
      // 3. pegamos a las APIs externas
      let remote: Food[] = [];
      
      try {
        const usdaResults = await searchUSDA(q);
        remote = [...remote, ...usdaResults];
      } catch (e) {
        console.warn('USDA search error:', e);
      }

      try {
        const offResults = await searchOFF(q);
        remote = [...remote, ...offResults];
      } catch (e) {
        console.warn('OFF search error:', e);
      }

      const uniqueRemote = remote.filter((f) => {
        const key = `${f.source}:${f.source_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setResults([...initialResults, ...uniqueRemote]);
    } catch {
      setErr('No se pudo buscar en línea. Se muestran solo resultados guardados.');
    }
    setBusy(false);
  }

  async function choose(f: Food) {
    const saved = f.id ? f : await cacheFood(f); // cachea al usarlo, nunca dos veces
    router.push({ pathname: '/add', params: { food: JSON.stringify(saved), date } });
  }

  return (
    <View style={s.wrap}>
      <TextInput
        style={s.input}
        placeholder="pollo, tortilla, avena…"
        placeholderTextColor={T.dim}
        value={q}
        onChangeText={setQ}
        onSubmitEditing={run}
        returnKeyType="search"
        autoFocus
      />
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <Pressable onPress={() => router.push({ pathname: '/scan', params: { date } })}>
          <Text style={{ color: T.prot, fontWeight: '600', fontSize: 14 }}>📷 Escanear barras</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: '/custom', params: { date } })}>
          <Text style={{ color: T.prot, fontWeight: '600', fontSize: 14 }}>✍️ Crear personalizado</Text>
        </Pressable>
      </View>

      {busy && <ActivityIndicator color={T.prot} style={{ marginTop: 20 }} />}

      <FlatList
        data={results}
        keyExtractor={(f, i) => `${f.source}:${f.source_id}:${i}`}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !busy && q.trim().length >= 2 ? (
            <View style={{ alignItems: 'center', marginTop: 40, gap: 12 }}>
              <Text style={{ color: T.dim, fontSize: 14, textAlign: 'center' }}>¿No encuentras el alimento en las bases de datos?</Text>
              <Pressable style={s.createBtn} onPress={() => router.push('/custom')}>
                <Text style={{ color: T.bg, fontWeight: '700', fontSize: 14 }}>Crear alimento personalizado</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <Pressable style={{ flex: 1 }} onPress={() => choose(item)}>
              <Text style={s.name} numberOfLines={2}>{item.name}</Text>
              <Text style={s.meta}>
                {item.brand ? `${item.brand} · ` : ''}
                {Math.round(item.kcal)} kcal · P {item.protein.toFixed(1)} · C {item.carbs.toFixed(1)} · G {item.fat.toFixed(1)} /100g
              </Text>
            </Pressable>
            
            {item.source === 'custom' ? (
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingLeft: 8 }}>
                <Pressable onPress={() => router.push({ pathname: '/custom', params: { food: JSON.stringify(item) } })}>
                  <Text style={{ fontSize: 16 }}>✏️</Text>
                </Pressable>
                <Pressable onPress={async () => {
                  await deleteCustomFood(item.id!);
                  run();
                }}>
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={s.tag}>{item.source}</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, padding: 16 },
  input: {
    backgroundColor: T.surface, borderRadius: T.r, padding: 15, color: T.text,
    fontSize: 16, borderWidth: 1, borderColor: T.line,
  },
  err: { color: T.carb, fontSize: 12, flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.line,
  },
  name: { color: T.text, fontSize: 15, fontWeight: '600' },
  meta: { color: T.dim, fontSize: 12, marginTop: 3 },
  tag: { color: T.dim, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  createBtn: { backgroundColor: T.prot, borderRadius: T.r, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
});
