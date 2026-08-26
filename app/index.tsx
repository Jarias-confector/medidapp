import { useCallback, useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { dayEntries, sumMacros, getGoals, deleteEntry } from '../lib/db';
import type { Entry, Macros } from '../lib/types';
import { T } from '../lib/theme';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';

const today = () => new Date().toISOString().slice(0, 10);

export default function Today() {
  const [selectedDate, setSelectedDate] = useState(today());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goals, setGoals] = useState<Macros>({ kcal: 2000, protein: 150, carbs: 200, fat: 65 });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const [e, g] = await Promise.all([dayEntries(selectedDate), getGoals()]);
    setEntries(e); setGoals(g); setLoading(false);
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = sumMacros(entries);

  function changeDate(days: number) {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  }

  function formatDateLabel(dateStr: string) {
    const t = today();
    if (dateStr === t) return 'Hoy';
    
    const d = new Date(t + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const y = d.toISOString().slice(0, 10);
    if (dateStr === y) return 'Ayer';

    const parts = dateStr.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${dateObj.getDate()} de ${months[dateObj.getMonth()]}`;
  }

  return (
    <View style={s.wrap}>
      {/* Selector de Fecha */}
      <View style={s.dateSelector}>
        <Pressable style={s.dateArrow} onPress={() => changeDate(-1)}>
          <Text style={s.arrowText}>◀</Text>
        </Pressable>
        <Text style={s.dateLabel}>{formatDateLabel(selectedDate)}</Text>
        <Pressable style={s.dateArrow} onPress={() => changeDate(1)}>
          <Text style={s.arrowText}>▶</Text>
        </Pressable>
      </View>

      <Pressable style={s.card} onPress={() => router.push('/goals')}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.kcal}>{Math.round(total.kcal)}</Text>
          <Text style={{ color: T.dim, fontSize: 18 }}>⚙️ Editar</Text>
        </View>
        <Text style={s.kcalSub}>de {goals.kcal} kcal · quedan {Math.max(0, Math.round(goals.kcal - total.kcal))}</Text>
        <View style={s.bars}>
          <Bar label="Proteína" v={total.protein} goal={goals.protein} color={T.prot} />
          <Bar label="Carbos"   v={total.carbs}   goal={goals.carbs}   color={T.carb} />
          <Bar label="Grasa"    v={total.fat}     goal={goals.fat}     color={T.fat} />
        </View>
      </Pressable>

      <View style={s.actions}>
        <Action icon="🔍" label="Buscar" onPress={() => router.push({ pathname: '/search', params: { date: selectedDate } })} />
        <Action icon="📷" label="Foto"   onPress={() => router.push({ pathname: '/photo', params: { date: selectedDate } })} />
        <Action icon="🍳" label="Menú"   onPress={() => router.push({ pathname: '/recipe', params: { date: selectedDate } })} />
        <Action icon="📊" label="Historial" onPress={() => router.push('/history')} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.dim} />}
        ListEmptyComponent={
          <Text style={s.empty}>Nada registrado hoy. Empieza con Buscar o Foto.</Text>
        }
        renderItem={({ item, index }) => {
          const f = item.foods!, k = item.grams / 100;
          return (
            <Animated.View
              entering={FadeInDown.delay(index * 30).duration(300)}
              exiting={FadeOutUp.duration(200)}
              layout={Layout.springify()}
            >
              <Pressable
                style={s.row}
                onLongPress={async () => { await deleteEntry(item.id, selectedDate); load(); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName} numberOfLines={1}>{f.name}</Text>
                  <Text style={s.rowMeta}>
                    {item.grams} g · {item.meal} · P {Math.round(f.protein * k)} C {Math.round(f.carbs * k)} G {Math.round(f.fat * k)}
                  </Text>
                </View>
                <Text style={s.rowKcal}>{Math.round(f.kcal * k)}</Text>
              </Pressable>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

function Bar({ label, v, goal, color }: { label: string; v: number; goal: number; color: string }) {
  const pct = Math.min(100, (v / goal) * 100);
  const widthVal = useSharedValue(0);

  useEffect(() => {
    widthVal.value = withTiming(pct, { duration: 600 });
  }, [pct]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${widthVal.value}%`,
  }));

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <Animated.View style={[s.barFill, animStyle, { backgroundColor: color }]} />
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
  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderRadius: T.r, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: T.line },
  dateArrow: { padding: 6 },
  arrowText: { color: T.prot, fontSize: 16, fontWeight: '700' },
  dateLabel: { color: T.text, fontSize: 16, fontWeight: '700' },
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
