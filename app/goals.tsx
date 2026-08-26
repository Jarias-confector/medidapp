import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getGoals, saveGoals } from '../lib/db';
import type { Macros } from '../lib/types';
import { T } from '../lib/theme';

export default function Goals() {
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    getGoals()
      .then((g) => {
        setKcal(String(g.kcal));
        setProtein(String(g.protein));
        setCarbs(String(g.carbs));
        setFat(String(g.fat));
      })
      .finally(() => setLoading(false));
  }, []);

  // Calcular kcal sugeridas basado en 4/4/9
  const calculatedKcal = (Number(protein) || 0) * 4 + (Number(carbs) || 0) * 4 + (Number(fat) || 0) * 9;

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      const parsedGoals: Macros = {
        kcal: Number(kcal) || calculatedKcal || 2000,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
      };
      await saveGoals(parsedGoals);
      router.back();
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudieron guardar las metas.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={[s.wrap, { justifyContent: 'center' }]}>
        <ActivityIndicator color={T.prot} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={s.intro}>Ajusta tus requerimientos diarios de energía y macronutrientes.</Text>

      <View style={s.group}>
        <Text style={s.label}>Proteína (g)</Text>
        <TextInput
          style={s.input}
          keyboardType="numeric"
          value={protein}
          onChangeText={(v) => {
            setProtein(v);
            // Auto actualizar kcal sugeridas
            const p = Number(v) || 0;
            const c = Number(carbs) || 0;
            const f = Number(fat) || 0;
            setKcal(String(p * 4 + c * 4 + f * 9));
          }}
        />
      </View>

      <View style={s.group}>
        <Text style={s.label}>Carbohidratos (g)</Text>
        <TextInput
          style={s.input}
          keyboardType="numeric"
          value={carbs}
          onChangeText={(v) => {
            setCarbs(v);
            // Auto actualizar kcal sugeridas
            const p = Number(protein) || 0;
            const c = Number(v) || 0;
            const f = Number(fat) || 0;
            setKcal(String(p * 4 + c * 4 + f * 9));
          }}
        />
      </View>

      <View style={s.group}>
        <Text style={s.label}>Grasas (g)</Text>
        <TextInput
          style={s.input}
          keyboardType="numeric"
          value={fat}
          onChangeText={(v) => {
            setFat(v);
            // Auto actualizar kcal sugeridas
            const p = Number(protein) || 0;
            const c = Number(carbs) || 0;
            const f = Number(v) || 0;
            setKcal(String(p * 4 + c * 4 + f * 9));
          }}
        />
      </View>

      <View style={s.group}>
        <Text style={s.label}>Calorías diarias (kcal)</Text>
        <TextInput
          style={s.input}
          keyboardType="numeric"
          value={kcal}
          onChangeText={setKcal}
        />
        <Text style={s.hint}>Cálculo por macros: {calculatedKcal} kcal</Text>
      </View>

      {!!msg && <Text style={s.err}>{msg}</Text>}

      <Pressable style={s.btn} onPress={save} disabled={busy}>
        <Text style={s.btnText}>{busy ? 'Guardando…' : 'Guardar metas'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, padding: 16 },
  intro: { color: T.dim, fontSize: 14, marginBottom: 8, lineHeight: 20 },
  group: { gap: 8 },
  label: { color: T.text, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: T.surface, borderRadius: T.r, padding: 14,
    color: T.text, fontSize: 16, borderWidth: 1, borderColor: T.line,
  },
  hint: { color: T.dim, fontSize: 11, marginTop: 2 },
  btn: { backgroundColor: T.prot, borderRadius: T.r, padding: 16, alignItems: 'center', marginTop: 12 },
  btnText: { color: T.bg, fontWeight: '700', fontSize: 16 },
  err: { color: T.carb, fontSize: 13, textAlign: 'center' },
});
