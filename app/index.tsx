import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { dayEntries, sumMacros, getGoals, deleteEntry } from '../lib/db';
import type { Entry, Macros } from '../lib/types';
import { T } from '../lib/theme';

const today = () => new Date().toISOString().slice(0, 10);

export default function Today() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goals, setGoals] = useState<Macros>({ kcal: 2000, protein: 150, carbs: 200, fat: 65 });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const [e, g] = await Promise.all([dayEntries(today()), getGoals()]);
    setEntries(e); setGoals(g); setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = sumMacros(entries);

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <Text style={s.kcal}>{Math.round(total.kcal)}</Text>
        <Text style={s.kcalSub}>de {goals.kcal} kcal · quedan {Math.max(0, Math.round(goals.kcal - total.kcal))}</Text>
        <View style={s.bars}>
          <Bar label="Proteína" v={total.protein} goal={goals.protein} color={T.prot} />
          <Bar label="Carbos"   v={total.carbs}   goal={goals.carbs}   color={T.carb} />
          <Bar label="Grasa"    v={total.fat}     goal={goals.fat}     color={T.fat} />
        </View>
      </View>

      <View style={s.actions}>
        <Action icon="🔍" label="Buscar" onPress={() => router.push('/search')} />
        <Action icon="▮▯" label="Código" onPress={() => router.push('/scan')} />
        <Action icon="📷" label="Foto"   onPress={() => router.push('/photo')} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.dim} />}
        ListEmptyComponent={
          <Text style={s.empty}>Nada registrado hoy. Empieza con Buscar o Foto.</Text>
        }
        renderItem={({ item }) => {
          const f = item.foods!, k = item.grams / 100;
          return (
            <Pressable
              style={s.row}
              onLongPress={async () => { await deleteEntry(item.id); load(); }}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.rowName} numberOfLines={1}>{f.name}</Text>
                <Text style={s.rowMeta}>
                  {item.grams} g · {item.meal} · P {Math.round(f.protein * k)} C {Math.round(f.carbs * k)} G {Math.round(f.fat * k)}
                </Text>
              </View>
              <Text style={s.rowKcal}>{Math.round(f.kcal * k)}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function Bar({ label, v, goal, color }: { label: string; v: number; goal: number; color: string }) {
  const pct = Math.min(100, (v / goal) * 100);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.barVal}>{Math.round(v)}<Text style={{ color: T.dim }}>/{goal}g</Text></Text>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={s.action} onPress={onPress}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={s.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, padding: 16, gap: 14 },
  card: { backgroundColor: T.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: T.line },
  kcal: { color: T.text, fontSize: 52, fontWeight: '800', letterSpacing: -2 },
  kcalSub: { color: T.dim, fontSize: 13, marginBottom: 20 },
  bars: { flexDirection: 'row', gap: 14 },
  barLabel: { color: T.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: T.line, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  barVal: { color: T.text, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1, backgroundColor: T.surface, borderRadius: T.r, paddingVertical: 14,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: T.line,
  },
  actionLabel: { color: T.text, fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.line,
  },
  rowName: { color: T.text, fontSize: 15, fontWeight: '600' },
  rowMeta: { color: T.dim, fontSize: 12, marginTop: 3 },
  rowKcal: { color: T.text, fontSize: 16, fontWeight: '700' },
  empty: { color: T.dim, textAlign: 'center', marginTop: 40, fontSize: 14, paddingHorizontal: 30 },
});
