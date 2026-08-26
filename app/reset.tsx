import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { completeRecoveryFromUrl, updatePassword } from '../lib/auth';
import { T } from '../lib/theme';

const MIN_PASSWORD = 6;

export default function Reset() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const url = Linking.useURL();
  const handled = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;
    completeRecoveryFromUrl(url).then((res) => {
      if (res.status === 'ok') setReady(true);
      else if (res.status === 'error') setMsg(res.message);
      else setMsg('Abre esta pantalla desde el enlace que te llegó por correo.');
    });
  }, [url]);

  async function save() {
    if (password.length < MIN_PASSWORD || busy) return;
    setBusy(true); setMsg('');
    try {
      await updatePassword(password);
      router.replace('/');
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo cambiar la contraseña. Intenta de nuevo.');
      setBusy(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Nueva contraseña</Text>

      {!ready && !msg && <ActivityIndicator color={T.prot} style={{ marginTop: 20 }} />}

      {ready && (
        <>
          <TextInput
            style={s.input}
            placeholder="nueva contraseña"
            placeholderTextColor={T.dim}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={save}
            returnKeyType="go"
            editable={!busy}
            autoFocus
          />
          <Pressable
            style={[s.btn, password.length < MIN_PASSWORD && s.btnOff]}
            onPress={save}
            disabled={password.length < MIN_PASSWORD || busy}
          >
            <Text style={s.btnText}>{busy ? 'Guardando…' : 'Guardar'}</Text>
          </Pressable>
          <Text style={s.hint}>Al menos {MIN_PASSWORD} caracteres.</Text>
        </>
      )}

      {!!msg && <Text style={s.msg}>{msg}</Text>}

      {!ready && (
        <Pressable onPress={() => router.replace('/login')} style={s.swap}>
          <Text style={s.link}>Volver a entrar</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, justifyContent: 'center', padding: 28, gap: 12 },
  title: { color: T.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 12 },
  input: {
    backgroundColor: T.surface, borderRadius: T.r, padding: 16,
    color: T.text, fontSize: 16, borderWidth: 1, borderColor: T.line,
  },
  btn: { backgroundColor: T.prot, borderRadius: T.r, padding: 16, alignItems: 'center', marginTop: 4 },
  btnOff: { opacity: 0.4 },
  btnText: { color: T.bg, fontWeight: '700', fontSize: 16 },
  swap: { alignItems: 'center', paddingVertical: 6 },
  link: { color: T.prot, fontSize: 13, fontWeight: '600' },
  msg: { color: T.dim, fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  hint: { color: T.dim, fontSize: 12, textAlign: 'center', marginTop: 4, opacity: 0.7 },
});
