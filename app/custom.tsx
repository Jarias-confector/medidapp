import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cacheFood } from '../lib/db';
import { T } from '../lib/theme';
import type { Food } from '../lib/types';

export default function CustomFood() {
  const { food: editRaw } = useLocalSearchParams<{ food?: string }>();
  const editFood: Food | null = editRaw ? JSON.parse(editRaw) : null;

  const [name, setName] = useState(editFood?.name ?? '');
  const [brand, setBrand] = useState(editFood?.brand ?? '');
  const [kcal, setKcal] = useState(editFood ? String(editFood.kcal) : '');
  const [protein, setProtein] = useState(editFood ? String(editFood.protein) : '');
  const [carbs, setCarbs] = useState(editFood ? String(editFood.carbs) : '');
  const [fat, setFat] = useState(editFood ? String(editFood.fat) : '');
  const [servingG, setServingG] = useState(editFood ? String(editFood.serving_g) : '100');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  const calculatedKcal = (Number(protein) || 0) * 4 + (Number(carbs) || 0) * 4 + (Number(fat) || 0) * 9;

  async function save() {
    if (!name.trim()) {
      setMsg('El nombre es obligatorio.');
      return;
    }
    setBusy(true);
    setMsg('');

    try {
      const foodItem = {
        source: 'custom' as const,
        source_id: editFood?.source_id ?? 'c_' + Math.random().toString(36).substring(2, 11),
        name: name.trim(),
        brand: brand.trim() || null,
        kcal: Number(kcal) || calculatedKcal || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        serving_g: Number(servingG) || 100,
        ...(editFood?.id ? { id: editFood.id } : {}),
      };

      const saved = await cacheFood(foodItem);
      router.replace({ pathname: '/add', params: { food: JSON.stringify(saved) } });
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo guardar el alimento.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={s.intro}>Crea un alimento o platillo personalizado. Valores por cada 100 g.</Text>

      <View style={s.group}>
        <Text style={s.label}>Nombre del alimento *</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: Licuado de plátano con avena, Ensalada César"
          placeholderTextColor={T.dim}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={s.group}>
        <Text style={s.label}>Marca o fabricante (opcional)</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: Casero, Kirkland"
          placeholderTextColor={T.dim}
          value={brand}
          onChangeText={setBrand}
        />
      </View>

      <View style={s.row}>
        <View style={[s.group, { flex: 1 }]}>
          <Text style={s.label}>Proteína (g)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={protein}
            onChangeText={(v) => {
              setProtein(v);
              // Actualizar calorías estimadas si el usuario no ha puesto una personalizada
              if (!kcal) {
                const cKcal = (Number(v) || 0) * 4 + (Number(carbs) || 0) * 4 + (Number(fat) || 0) * 9;
                setKcal(String(cKcal));
              }
            }}
          />
        </View>

        <View style={[s.group, { flex: 1 }]}>
          <Text style={s.label}>Carbos (g)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={carbs}
            onChangeText={(v) => {
              setCarbs(v);
              if (!kcal) {
                const cKcal = (Number(protein) || 0) * 4 + (Number(v) || 0) * 4 + (Number(fat) || 0) * 9;
                setKcal(String(cKcal));
              }
            }}
          />
        </View>

        <View style={[s.group, { flex: 1 }]}>
          <Text style={s.label}>Grasa (g)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={fat}
            onChangeText={(v) => {
              setFat(v);
              if (!kcal) {
                const cKcal = (Number(protein) || 0) * 4 + (Number(carbs) || 0) * 4 + (Number(v) || 0) * 9;
                setKcal(String(cKcal));
              }
            }}
          />
        </View>
      </View>

      <View style={s.row}>
        <View style={[s.group, { flex: 1 }]}>
          <Text style={s.label}>Calorías (kcal)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={kcal}
            onChangeText={setKcal}
          />
          <Text style={s.hint}>Por macros: {calculatedKcal} kcal</Text>
        </View>

        <View style={[s.group, { flex: 1 }]}>
          <Text style={s.label}>Porción estándar (g)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={servingG}
            onChangeText={setServingG}
          />
          <Text style={s.hint}>Ej: peso de 1 pieza</Text>
        </View>
      </View>

      {!!msg && <Text style={s.err}>{msg}</Text>}

      <Pressable style={s.btn} onPress={save} disabled={busy}>
        <Text style={s.btnText}>{busy ? 'Guardando…' : 'Crear y registrar porción'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, padding: 16 },
  intro: { color: T.dim, fontSize: 13, marginBottom: 8, lineHeight: 18 },
  group: { gap: 6 },
  row: { flexDirection: 'row', gap: 10 },
  label: { color: T.text, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: T.surface, borderRadius: T.r, padding: 12,
    color: T.text, fontSize: 15, borderWidth: 1, borderColor: T.line,
  },
  hint: { color: T.dim, fontSize: 10, marginTop: 2 },
  btn: { backgroundColor: T.prot, borderRadius: T.r, padding: 16, alignItems: 'center', marginTop: 16 },
  btnText: { color: T.bg, fontWeight: '700', fontSize: 16 },
  err: { color: T.carb, fontSize: 13, textAlign: 'center' },
});
