import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { sendMagicLink, completeSignInFromUrl, authRedirectUrl } from '../lib/auth';
import { T } from '../lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const url = Linking.useURL();
  const handled = useRef<string | null>(null);

  // El enlace del correo regresa a esta pantalla con el code o los tokens.
  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;
    setBusy(true);
    completeSignInFromUrl(url)
      .then((res) => {
        if (res.status === 'error') setMsg(res.message);
        // 'none' es normal: la app tambien se abre por deep links sin auth.
      })
      .finally(() => setBusy(false));
  }, [url]);

  async function send() {
    setBusy(true);
    try {
      await sendMagicLink(email);
      setMsg('Revisa tu correo y abre el enlace para entrar.');
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo enviar el enlace. Intenta de nuevo.');
    }
    setBusy(false);
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Macros</Text>
      <Text style={s.sub}>Registra lo que comes. Sin suscripción.</Text>

      <TextInput
        style={s.input}
        placeholder="tu@correo.com"
        placeholderTextColor={T.dim}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Pressable style={s.btn} onPress={send} disabled={busy || !email.includes('@')}>
        <Text style={s.btnText}>{busy ? 'Enviando…' : 'Enviar enlace'}</Text>
      </Pressable>
      {!!msg && <Text style={s.msg}>{msg}</Text>}
      {__DEV__ && (
        <Text style={s.debug}>
          El enlace regresa a {authRedirectUrl()}. Esa url debe estar en los redirect urls del proyecto.
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, justifyContent: 'center', padding: 28, gap: 12 },
  title: { color: T.text, fontSize: 40, fontWeight: '700', letterSpacing: -1 },
  sub: { color: T.dim, fontSize: 15, marginBottom: 20 },
  input: {
    backgroundColor: T.surface, borderRadius: T.r, padding: 16,
    color: T.text, fontSize: 16, borderWidth: 1, borderColor: T.line,
  },
  btn: { backgroundColor: T.prot, borderRadius: T.r, padding: 16, alignItems: 'center' },
  btnText: { color: T.bg, fontWeight: '700', fontSize: 16 },
  msg: { color: T.dim, fontSize: 13, textAlign: 'center', marginTop: 8 },
  debug: { color: T.dim, fontSize: 11, textAlign: 'center', marginTop: 20, opacity: 0.7 },
});
