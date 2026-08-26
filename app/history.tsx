import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { dayEntries, sumMacros, getGoals } from '../lib/db';
import type { Entry, Macros } from '../lib/types';
import { T } from '../lib/theme';

type DaySummary = {
  date: string;
  label: string;
  total: Macros;
  entries: Entry[];
};

export default function History() {
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<DaySummary[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(6); // Por defecto el día de hoy (último de la semana)
  const [goals, setGoals] = useState<Macros>({ kcal: 2000, protein: 150, carbs: 200, fat: 65 });

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const g = await getGoals();
      setGoals(g);

      // Calcular fechas de los últimos 7 días
      const days: DaySummary[] = [];
      const today = new Date();
      const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        
        // Cargar entradas de esta fecha
        const entries = await dayEntries(dateStr);
        const total = sumMacros(entries);

        days.push({
          date: dateStr,
          label: weekdays[d.getDay()],
          total,
          entries,
        });
      }

      setWeeklyData(days);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <View style={[s.wrap, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={T.prot} size="large" />
      </View>
    );
  }

  const selectedDay = weeklyData[selectedDayIdx];
  const maxKcal = Math.max(goals.kcal, ...weeklyData.map((d) => d.total.kcal));

  return (
    <View style={s.wrap}>
      <Text style={s.sectionTitle}>Últimos 7 días</Text>

      {/* Gráfica de Barras Nativa */}
      <View style={s.chartContainer}>
        <View style={s.chartBars}>
          {weeklyData.map((day, idx) => {
            const isSelected = idx === selectedDayIdx;
            const pct = maxKcal > 0 ? (day.total.kcal / maxKcal) * 100 : 0;
            const goalPct = (day.total.kcal / goals.kcal) * 100;

            // Determinar color basado en meta
            let barColor = T.dim; // sin consumo
            if (day.total.kcal > 0) {
              if (goalPct > 105) barColor = T.fat; // Excedido (Rojo/Grasa)
              else if (goalPct >= 80) barColor = T.prot; // Perfecto (Verde/Proteína)
              else barColor = T.carb; // Bajo (Amarillo/Carbo)
            }

            return (
              <Pressable key={day.date} style={s.barCol} onPress={() => setSelectedDayIdx(idx)}>
                <View style={s.barTrack}>
                  <View
                    style={[
                      s.barFill,
                      {
                        height: `${Math.max(4, pct)}%`,
                        backgroundColor: barColor,
                        opacity: isSelected ? 1 : 0.65,
                      },
                    ]}
                  />
                </View>
                <Text style={[s.barLabel, isSelected && s.barLabelSelected]}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Detalle del Día Seleccionado */}
      {selectedDay && (
        <View style={{ flex: 1, marginTop: 10 }}>
          <View style={s.dayHeader}>
            <Text style={s.dayTitle}>
              {selectedDay.date === new Date().toISOString().slice(0, 10) ? 'Hoy' : selectedDay.date}
            </Text>
            <Text style={s.dayKcal}>{Math.round(selectedDay.total.kcal)} / {goals.kcal} kcal</Text>
          </View>

          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={[s.statVal, { color: T.prot }]}>{Math.round(selectedDay.total.protein)}g</Text>
              <Text style={s.statLbl}>Prot ({goals.protein}g)</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statVal, { color: T.carb }]}>{Math.round(selectedDay.total.carbs)}g</Text>
              <Text style={s.statLbl}>Carbs ({goals.carbs}g)</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statVal, { color: T.fat }]}>{Math.round(selectedDay.total.fat)}g</Text>
              <Text style={s.statLbl}>Grasa ({goals.fat}g)</Text>
            </View>
          </View>

          <Text style={s.subHeader}>Alimentos registrados</Text>
          <FlatList
            data={selectedDay.entries}
            keyExtractor={(e) => e.id}
            style={{ flex: 1 }}
            ListEmptyComponent={
              <Text style={s.empty}>Sin registros en este día.</Text>
            }
            renderItem={({ item }) => {
              const f = item.foods!, k = item.grams / 100;
              return (
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName} numberOfLines={1}>{f.name}</Text>
                    <Text style={s.rowMeta}>
                      {item.grams} g · {item.meal} · P {Math.round(f.protein * k)}g C {Math.round(f.carbs * k)}g G {Math.round(f.fat * k)}g
                    </Text>
                  </View>
                  <Text style={s.rowKcal}>{Math.round(f.kcal * k)}</Text>
                </View>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, padding: 16, gap: 14 },
  sectionTitle: { color: T.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  chartContainer: { backgroundColor: T.surface, borderRadius: T.r, padding: 16, borderWidth: 1, borderColor: T.line },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', height: 160, alignItems: 'flex-end' },
  barCol: { alignItems: 'center', width: '12%', height: '100%', justifyContent: 'flex-end', gap: 8 },
  barTrack: { backgroundColor: T.line, width: 14, height: 120, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 7 },
  barLabel: { color: T.dim, fontSize: 11, fontWeight: '500' },
  barLabelSelected: { color: T.text, fontWeight: '700' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.line, paddingBottom: 10 },
  dayTitle: { color: T.text, fontSize: 18, fontWeight: '700' },
  dayKcal: { color: T.text, fontSize: 16, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginVertical: 10 },
  statBox: { flex: 1, backgroundColor: T.surface, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: T.line },
  statVal: { fontSize: 16, fontWeight: '700' },
  statLbl: { color: T.dim, fontSize: 10, marginTop: 2, textAlign: 'center' },
  subHeader: { color: T.text, fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.line },
  rowName: { color: T.text, fontSize: 14, fontWeight: '600' },
  rowMeta: { color: T.dim, fontSize: 11, marginTop: 2 },
  rowKcal: { color: T.text, fontSize: 15, fontWeight: '700' },
  empty: { color: T.dim, textAlign: 'center', marginTop: 30, fontSize: 13 },
});
