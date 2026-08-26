import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { lookupBarcode } from '../lib/off';
import { cacheFood } from '../lib/db';
import { T } from '../lib/theme';

export default function Scan() {
  const [perm, requestPerm] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [msg, setMsg] = useState('Apunta al código de barras');
  const router = useRouter();

  if (!perm) return null;
  if (!perm.granted) {
    return (
      <View style={s.center}>
        <Text style={s.msg}>Necesitamos la cámara para leer códigos de barras.</Text>
        <Pressable style={s.btn} onPress={requestPerm}>
          <Text style={s.btnText}>Dar acceso</Text>
        </Pressable>
      </View>
    );
  }

  async function onScan({ data }: { data: string }) {
    if (locked) return;
    setLocked(true);
    setMsg('Buscando…');

    const food = await lookupBarcode(data);
    if (!food) {
      // status:0 o sin panel nutricional -> no inventes datos
      setMsg('Ese producto no está en Open Food Facts. Búscalo por nombre.');
      setTimeout(() => { setLocked(false); setMsg('Apunta al código de barras'); }, 2500);
      return;
    }

    const saved = await cacheFood(food);
    router.replace({ pathname: '/add', params: { food: JSON.stringify(saved) } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={onScan}
      />
      <Text style={s.hint}>{msg}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: T.bg, justifyContent: 'center', padding: 30, gap: 16 },
  msg: { color: T.text, fontSize: 15, textAlign: 'center' },
  btn: { backgroundColor: T.prot, borderRadius: T.r, padding: 14, alignItems: 'center' },
  btnText: { color: T.bg, fontWeight: '700' },
  hint: { color: T.text, textAlign: 'center', padding: 20, fontSize: 14, backgroundColor: T.bg },
});
