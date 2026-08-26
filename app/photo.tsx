import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, searchCache, cacheFood, addEntry } from '../lib/db';
import { searchUSDA } from '../lib/usda';
import type { Food } from '../lib/types';
import { T } from '../lib/theme';

type Item = { nombre: string; gramos: number; confianza: number };

export default function Photo() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  async function pick(fromCamera: boolean) {
    const fn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const res = await fn({ quality: 0.7 });
    if (res.canceled) return;

    setBusy(true); setMsg('Analizando la foto…');

    // comprimir antes de subir: menos tokens, menos latencia
    const small = await ImageManipulator.manipulateAsync(
      res.assets[0].uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    let data: { items?: Item[]; error?: string } | null = null;
    let errorMsg: string | null = null;

    try {
      const response = await supabase.functions.invoke('analyze-photo', {
        body: { imageBase64: small.base64, mimeType: 'image/jpeg' },
      });
      data = response.data;
      if (response.error) {
        errorMsg = String(response.error);
      }
    } catch (e: any) {
      errorMsg = e.message || String(e);
    }

    // Si falló el Edge Function, intentamos llamada directa desde el cliente si tenemos la key
    if (errorMsg || data?.error || !data?.items) {
      const geminiKey = process.env.EXPO_PUBLIC_GEMINI_KEY;
      if (geminiKey) {
        try {
          const MODEL = 'gemini-1.5-flash';
          const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiKey}`;
          const PROMPT = `Eres un analista de nutrición. Identifica los alimentos visibles en la foto.
Estima el peso en gramos de cada uno usando referencias visuales (plato ~26cm, cubiertos, mano).
Responde SOLO con un array JSON, sin markdown, sin texto extra:
[{"nombre":"pechuga de pollo a la plancha","gramos":150,"confianza":0.8}]
Reglas:
- nombre en español, específico, incluye método de cocción.
- separa cada componente del plato, no agrupes.
- confianza entre 0 y 1.
- si no distingues comida, responde [].`;

          const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: PROMPT },
                  { inlineData: { mimeType: 'image/jpeg', data: small.base64 } },
                ],
              }],
              generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
            }),
          });

          if (res.ok) {
            const resJson = await res.json();
            const raw = resJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
            const items = JSON.parse(raw.replace(/```json|```/g, '').trim());
            data = { items };
            errorMsg = null;
          } else {
            errorMsg = `Gemini API HTTP ${res.status}`;
          }
        } catch (clientErr: any) {
          errorMsg = clientErr.message || String(clientErr);
        }
      }
    }

    setBusy(false);
    if (errorMsg || data?.error) { setMsg(data?.error ?? errorMsg ?? 'Falló el análisis. Intenta de nuevo.'); return; }
    if (!data || !data.items?.length) { setMsg('No se reconoció comida en la foto. Registra manualmente.'); return; }

    setItems(data.items);
    setMsg('Revisa los gramos antes de guardar. La estimación visual falla fácil ±30%.');
  }

  async function saveAll() {
    setBusy(true);
    for (const it of items) {
      let food: Food | undefined = (await searchCache(it.nombre))[0];
      if (!food) {
        const remote = await searchUSDA(it.nombre);
        if (!remote.length) continue;       // sin match confiable, se omite
        food = await cacheFood(remote[0]);
      }
      await addEntry(food.id!, it.gramos, 'comida', date);
    }
    setBusy(false);
    router.replace('/');
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable style={s.btn} onPress={() => pick(true)}><Text style={s.btnText}>Tomar foto</Text></Pressable>
        <Pressable style={s.btnAlt} onPress={() => pick(false)}><Text style={s.btnAltText}>Galería</Text></Pressable>
      </View>

      {busy && <ActivityIndicator color={T.prot} />}
      {!!msg && <Text style={s.msg}>{msg}</Text>}

      {items.map((it, i) => (
        <View key={i} style={s.card}>
          <TextInput
            style={s.name}
            value={it.nombre}
            onChangeText={(v) => setItems(items.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
          />
          <View style={s.gramRow}>
            <TextInput
              style={s.grams}
              keyboardType="numeric"
              value={String(it.gramos)}
              onChangeText={(v) =>
                setItems(items.map((x, j) => (j === i ? { ...x, gramos: Number(v) || 0 } : x)))
              }
            />
            <Text style={s.unit}>g</Text>
            <Text style={s.conf}>confianza {Math.round(it.confianza * 100)}%</Text>
            <Pressable onPress={() => setItems(items.filter((_, j) => j !== i))}>
              <Text style={s.remove}>Quitar</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {items.length > 0 && (
        <Pressable style={s.btn} onPress={saveAll} disabled={busy}>
          <Text style={s.btnText}>Guardar {items.length} alimentos</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, padding: 16 },
  btn: { flex: 1, backgroundColor: T.prot, borderRadius: T.r, padding: 15, alignItems: 'center' },
  btnText: { color: T.bg, fontWeight: '700', fontSize: 15 },
  btnAlt: { flex: 1, backgroundColor: T.surface, borderRadius: T.r, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: T.line },
  btnAltText: { color: T.text, fontWeight: '600', fontSize: 15 },
  msg: { color: T.dim, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: T.surface, borderRadius: T.r, padding: 14, gap: 10, borderWidth: 1, borderColor: T.line },
  name: { color: T.text, fontSize: 15, fontWeight: '600' },
  gramRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grams: { backgroundColor: T.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: T.text, fontSize: 16, minWidth: 70 },
  unit: { color: T.dim, fontSize: 14 },
  conf: { color: T.dim, fontSize: 11, flex: 1 },
  remove: { color: T.fat, fontSize: 12, fontWeight: '600' },
});
