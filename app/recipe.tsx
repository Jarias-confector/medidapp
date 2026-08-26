import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, FlatList, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cacheFood, searchCache } from '../lib/db';
import { searchUSDA } from '../lib/usda';
import { searchOFF } from '../lib/off';
import { searchBasics } from '../lib/basics';
import type { Food } from '../lib/types';
import { T } from '../lib/theme';

type Ingredient = {
  food: Food;
  grams: number;
};

export default function Recipe() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [busySearch, setBusySearch] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [gramsInput, setGramsInput] = useState('100');
  const [busySave, setBusySave] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  // Calcular totales acumulados de la receta
  const totalWeight = ingredients.reduce((acc, ing) => acc + ing.grams, 0);
  const totalKcal = ingredients.reduce((acc, ing) => acc + (ing.food.kcal * ing.grams) / 100, 0);
  const totalProt = ingredients.reduce((acc, ing) => acc + (ing.food.protein * ing.grams) / 100, 0);
  const totalCarb = ingredients.reduce((acc, ing) => acc + (ing.food.carbs * ing.grams) / 100, 0);
  const totalFat = ingredients.reduce((acc, ing) => acc + (ing.food.fat * ing.grams) / 100, 0);

  async function searchIngredients() {
    if (q.trim().length < 2) return;
    setBusySearch(true);
    try {
      // 1. Alimentos básicos locales primero
      const basics = searchBasics(q);

      // 2. Cache local de Supabase
      const local = await searchCache(q);

      // Combinar únicos
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

      // 3. Pegar a las APIs externas
      let remote: Food[] = [];
      try {
        const usdaRes = await searchUSDA(q);
        remote = [...remote, ...usdaRes];
      } catch {}
      try {
        const offRes = await searchOFF(q);
        remote = [...remote, ...offRes];
      } catch {}

      const uniqueRemote = remote.filter((f) => {
        const key = `${f.source}:${f.source_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setResults([...initialResults, ...uniqueRemote]);
    } catch {
      setMsg('Error buscando alimentos en línea.');
    } finally {
      setBusySearch(false);
    }
  }

  function addIngredient() {
    if (!selectedFood || !Number(gramsInput)) return;
    setIngredients([
      ...ingredients,
      { food: selectedFood, grams: Number(gramsInput) },
    ]);
    setSelectedFood(null);
    setResults([]);
    setQ('');
    setShowSearch(false);
  }

  async function save() {
    if (!name.trim()) {
      setMsg('Por favor ingresa un nombre para el menú/receta.');
      return;
    }
    if (ingredients.length === 0) {
      setMsg('Agrega al menos un ingrediente.');
      return;
    }
    setBusySave(true);
    setMsg('');

    try {
      // Normalizar macros por cada 100g
      const scale = totalWeight > 0 ? 100 / totalWeight : 1;
      const normalizedFood: Food = {
        source: 'custom' as const,
        source_id: 'r_' + Math.random().toString(36).substring(2, 11),
        name: name.trim(),
        brand: 'Receta casera',
        kcal: totalKcal * scale,
        protein: totalProt * scale,
        carbs: totalCarb * scale,
        fat: totalFat * scale,
        serving_g: totalWeight, // la porción por defecto es todo el menú
      };

      const saved = await cacheFood(normalizedFood);
      // Redirigir a pantalla final de porción para que lo agregue directamente si gusta
      router.replace({ pathname: '/add', params: { food: JSON.stringify(saved), date } });
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo guardar la receta.');
    } finally {
      setBusySave(false);
    }
  }

  return (
    <View style={s.container}>
      <ScrollView style={s.wrap} contentContainerStyle={{ gap: 14, paddingBottom: 40 }}>
        <Text style={s.intro}>Crea un menú o platillo compuesto (receta). Suma los ingredientes y calcula los macros automáticamente.</Text>

        <View style={s.group}>
          <Text style={s.label}>Nombre del menú o receta</Text>
          <TextInput
            style={s.input}
            placeholder="Ej: Mi Desayuno Diario, Cena de hoy"
            placeholderTextColor={T.dim}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Ingredientes ({ingredients.length})</Text>
          <Pressable style={s.addBtn} onPress={() => setShowSearch(true)}>
            <Text style={s.addBtnText}>+ Ingrediente</Text>
          </Pressable>
        </View>

        {ingredients.length === 0 ? (
          <Text style={s.emptyText}>No has agregado ingredientes aún.</Text>
        ) : (
          ingredients.map((ing, i) => (
            <View key={i} style={s.ingRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.ingName}>{ing.food.name}</Text>
                <Text style={s.ingMeta}>
                  {ing.grams} g · {Math.round((ing.food.kcal * ing.grams) / 100)} kcal · P {((ing.food.protein * ing.grams) / 100).toFixed(1)}g · C {((ing.food.carbs * ing.grams) / 100).toFixed(1)}g
                </Text>
              </View>
              <Pressable onPress={() => setIngredients(ingredients.filter((_, idx) => idx !== i))}>
                <Text style={s.remove}>Quitar</Text>
              </Pressable>
            </View>
          ))
        )}

        {ingredients.length > 0 && (
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Totales del menú</Text>
            <Text style={s.summaryWeight}>Peso total: {totalWeight} g</Text>
            <View style={s.summaryGrid}>
              <View style={s.gridItem}>
                <Text style={[s.gridVal, { color: T.text }]}>{Math.round(totalKcal)}</Text>
                <Text style={s.gridLbl}>kcal</Text>
              </View>
              <View style={s.gridItem}>
                <Text style={[s.gridVal, { color: T.prot }]}>{Math.round(totalProt)}g</Text>
                <Text style={s.gridLbl}>prot</Text>
              </View>
              <View style={s.gridItem}>
                <Text style={[s.gridVal, { color: T.carb }]}>{Math.round(totalCarb)}g</Text>
                <Text style={s.gridLbl}>carb</Text>
              </View>
              <View style={s.gridItem}>
                <Text style={[s.gridVal, { color: T.fat }]}>{Math.round(totalFat)}g</Text>
                <Text style={s.gridLbl}>grasa</Text>
              </View>
            </View>
          </View>
        )}

        {!!msg && <Text style={s.err}>{msg}</Text>}

        {ingredients.length > 0 && (
          <Pressable style={s.btn} onPress={save} disabled={busySave}>
            <Text style={s.btnText}>{busySave ? 'Guardando…' : 'Guardar y registrar menú'}</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Buscador de Ingredientes */}
      <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSearch(false)}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Buscar Ingrediente</Text>
            <Pressable onPress={() => { setShowSearch(false); setSelectedFood(null); }}>
              <Text style={s.modalClose}>Cerrar</Text>
            </Pressable>
          </View>

          {!selectedFood ? (
            <View style={{ flex: 1, padding: 16 }}>
              <TextInput
                style={s.input}
                placeholder="Busca ingrediente (ej: huevo, tortilla)..."
                placeholderTextColor={T.dim}
                value={q}
                onChangeText={setQ}
                onSubmitEditing={searchIngredients}
                returnKeyType="search"
                autoFocus
              />
              {busySearch && <ActivityIndicator color={T.prot} style={{ marginTop: 20 }} />}
              <FlatList
                data={results}
                keyExtractor={(f, i) => `${f.source}:${f.source_id}:${i}`}
                style={{ marginTop: 10 }}
                renderItem={({ item }) => (
                  <Pressable style={s.row} onPress={() => { setSelectedFood(item); setGramsInput(String(item.serving_g || 100)); }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                      <Text style={s.meta}>
                        {Math.round(item.kcal)} kcal · P {item.protein.toFixed(1)} · C {item.carbs.toFixed(1)} · G {item.fat.toFixed(1)}
                      </Text>
                    </View>
                    <Text style={s.tag}>{item.source}</Text>
                  </Pressable>
                )}
              />
            </View>
          ) : (
            <View style={{ padding: 20, gap: 16 }}>
              <Text style={s.modalSub}>{selectedFood.name}</Text>
              <View style={s.gramRow}>
                <TextInput
                  style={s.grams}
                  keyboardType="numeric"
                  value={gramsInput}
                  onChangeText={setGramsInput}
                  autoFocus
                />
                <Text style={s.unit}>gramos</Text>
              </View>
              <Pressable style={s.btn} onPress={addIngredient}>
                <Text style={s.btnText}>Agregar ingrediente</Text>
              </Pressable>
              <Pressable style={s.btnAlt} onPress={() => setSelectedFood(null)}>
                <Text style={s.btnAltText}>Volver a buscar</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  wrap: { flex: 1, padding: 16 },
  intro: { color: T.dim, fontSize: 13, marginBottom: 8, lineHeight: 18 },
  group: { gap: 6 },
  label: { color: T.text, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: T.surface, borderRadius: T.r, padding: 12,
    color: T.text, fontSize: 15, borderWidth: 1, borderColor: T.line,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 },
  sectionTitle: { color: T.text, fontSize: 16, fontWeight: '700' },
  addBtn: { backgroundColor: T.surface, borderStyle: 'dashed', borderWidth: 1, borderColor: T.prot, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: T.prot, fontSize: 12, fontWeight: '600' },
  emptyText: { color: T.dim, fontSize: 13, fontStyle: 'italic', paddingVertical: 10 },
  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.line },
  ingName: { color: T.text, fontSize: 14, fontWeight: '600' },
  ingMeta: { color: T.dim, fontSize: 11, marginTop: 2 },
  remove: { color: T.fat, fontSize: 12, fontWeight: '600' },
  summaryCard: { backgroundColor: T.surface, borderRadius: T.r, padding: 16, marginTop: 14, borderWidth: 1, borderColor: T.line },
  summaryTitle: { color: T.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  summaryWeight: { color: T.dim, fontSize: 12, marginBottom: 12 },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  gridItem: { flex: 1, alignItems: 'center', gap: 2 },
  gridVal: { fontSize: 16, fontWeight: '700' },
  gridLbl: { color: T.dim, fontSize: 10, textTransform: 'uppercase' },
  btn: { backgroundColor: T.prot, borderRadius: T.r, padding: 16, alignItems: 'center', marginTop: 16 },
  btnText: { color: T.bg, fontWeight: '700', fontSize: 16 },
  btnAlt: { backgroundColor: T.surface, borderRadius: T.r, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: T.line },
  btnAltText: { color: T.text, fontWeight: '600', fontSize: 16 },
  err: { color: T.carb, fontSize: 13, textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: T.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.line },
  modalTitle: { color: T.text, fontSize: 16, fontWeight: '700' },
  modalSub: { color: T.text, fontSize: 18, fontWeight: '700' },
  modalClose: { color: T.dim, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.line },
  name: { color: T.text, fontSize: 14, fontWeight: '600' },
  meta: { color: T.dim, fontSize: 11, marginTop: 2 },
  tag: { color: T.dim, fontSize: 9, textTransform: 'uppercase' },
  gramRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  grams: { backgroundColor: T.surface, borderRadius: T.r, paddingHorizontal: 16, paddingVertical: 12, color: T.text, fontSize: 24, fontWeight: '700', minWidth: 100, borderWidth: 1, borderColor: T.line },
  unit: { color: T.dim, fontSize: 14 },
});
