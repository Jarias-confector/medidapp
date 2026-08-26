import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addEntry } from '../lib/db';
import type { Food, Meal } from '../lib/types';
import { T } from '../lib/theme';

const MEALS: Meal[] = ['desayuno', 'comida', 'cena', 'snack'];

export default function Add() {
  const { food: raw, date } = useLocalSearchParams<{ food: string; date?: string }>();
  const food: Food = JSON.parse(raw);
  
  const [unit, setUnit] = useState<'g' | 'pza'>(food.serving_g ? 'pza' : 'g');
  const [inputValue, setInputValue] = useState(unit === 'pza' ? '1' : String(food.serving_g ?? 100));
  const [meal, setMeal] = useState<Meal>('comida');
  const router = useRouter();

  const finalGrams = unit === 'pza' ? (Number(inputValue) || 0) * (food.serving_g || 1) : (Number(inputValue) || 0);
  const k = finalGrams / 100;

  return (
    <View style={s.wrap}>
      <Text style={s.name}>{food.name}</Text>
      {!!food.brand && <Text style={s.brand}>{food.brand}</Text>}

      {/* Selector de unidad */}
      {!!food.serving_g && (
        <View style={s.unitTabs}>
          <Pressable
            style={[s.unitTab, unit === 'pza' && s.unitTabOn]}
            onPress={() => {
              setUnit('pza');
              setInputValue('1');
            }}
          >
            <Text style={[s.unitTabText, unit === 'pza' && { color: T.bg }]}>Piezas ({food.serving_g}g)</Text>
          </Pressable>
          <Pressable
            style={[s.unitTab, unit === 'g' && s.unitTabOn]}
            onPress={() => {
              setUnit('g');
              setInputValue(String(food.serving_g || 100));
            }}
          >
            <Text style={[s.unitTabText, unit === 'g' && { color: T.bg }]}>Gramos (g)</Text>
          </Pressable>
        </View>
      )}

      <View style={s.gramRow}>
        <TextInput
          style={s.grams}
          keyboardType="numeric"
          value={inputValue}
          onChangeText={setInputValue}
          autoFocus
        />
        <Text style={s.unit}>{unit === 'pza' ? 'pieza(s)' : 'gramos'}</Text>
      </View>

      {unit === 'pza' && (
        <Text style={s.eqLabel}>Equivale a: <Text style={{ fontWeight: '700', color: T.text }}>{Math.round(finalGrams)} g</Text></Text>
      )}

      <View style={s.preview}>
        <Stat v={food.kcal * k} label="kcal" color={T.text} />
        <Stat v={food.protein * k} label="prot" color={T.prot} />
        <Stat v={food.carbs * k} label="carb" color={T.carb} />
        <Stat v={food.fat * k} label="grasa" color={T.fat} />
      </View>

      <View style={s.meals}>
        {MEALS.map((m) => (
          <Pressable key={m} onPress={() => setMeal(m)} style={[s.meal, meal === m && s.mealOn]}>
            <Text style={[s.mealText, meal === m && { color: T.bg }]}>{m}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={s.btn}
        disabled={!Number(inputValue)}
        onPress={async () => {
          await addEntry(food.id!, Math.round(finalGrams), meal, date);
          router.dismissAll();
          router.replace('/');
        }}
      >
        <Text style={s.btnText}>Agregar a {meal}</Text>
      </Pressable>
    </View>
  );
}

function Stat({ v, label, color }: { v: number; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[s.statV, { color }]}>{Math.round(v)}</Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, padding: 20, gap: 16 },
  name: { color: T.text, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  brand: { color: T.dim, fontSize: 13, marginTop: -12 },
  unitTabs: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 10, padding: 4, borderWidth: 1, borderColor: T.line },
  unitTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  unitTabOn: { backgroundColor: T.prot },
  unitTabText: { color: T.dim, fontSize: 13, fontWeight: '600' },
  gramRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  grams: { backgroundColor: T.surface, borderRadius: T.r, paddingHorizontal: 18, paddingVertical: 14, color: T.text, fontSize: 32, fontWeight: '700', minWidth: 130, borderWidth: 1, borderColor: T.line },
  unit: { color: T.dim, fontSize: 15 },
  eqLabel: { color: T.dim, fontSize: 14, marginTop: -8 },
  preview: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: T.r, padding: 16, borderWidth: 1, borderColor: T.line },
  statV: { fontSize: 20, fontWeight: '700' },
  statL: { color: T.dim, fontSize: 11, marginTop: 2 },
  meals: { flexDirection: 'row', gap: 8 },
  meal: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  mealOn: { backgroundColor: T.prot, borderColor: T.prot },
  mealText: { color: T.dim, fontSize: 12, fontWeight: '600' },
  btn: { backgroundColor: T.prot, borderRadius: T.r, padding: 16, alignItems: 'center', marginTop: 'auto' },
  btnText: { color: T.bg, fontWeight: '700', fontSize: 16 },
});
