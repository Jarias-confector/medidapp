import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../lib/db';
import { T } from '../lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    setMsg(error ? error.message : 'Revisa tu correo y abre el enlace para entrar.');
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
});
