import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { signIn, signUp, sendPasswordReset } from '../lib/auth';
import { T } from '../lib/theme';

const MIN_PASSWORD = 6;

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = email.includes('@') && password.length >= MIN_PASSWORD;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true); setMsg('');
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        // El listener de sesión en _layout se encarga de sacarnos de aquí.
      } else {
        const res = await signUp(email, password);
        if (res.status === 'needs_confirmation') {
          setMsg('Te mandamos un correo para confirmar la cuenta. Ábrelo y luego entra.');
          setBusy(false);
        }
      }
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo continuar. Intenta de nuevo.');
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email.includes('@')) {
      setMsg('Escribe tu correo primero.');
      return;
    }
    setBusy(true); setMsg('');
    try {
      await sendPasswordReset(email);
      setMsg('Si ese correo tiene cuenta, te llega un enlace para cambiar la contraseña.');
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo mandar el correo. Intenta de nuevo.');
    }
    setBusy(false);
  }

  function swap() {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setMsg('');
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
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
      />
      <TextInput
        style={s.input}
        placeholder="contraseña"
        placeholderTextColor={T.dim}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        textContentType={mode === 'signin' ? 'password' : 'newPassword'}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
        returnKeyType="go"
        editable={!busy}
      />

      <Pressable style={[s.btn, !ready && s.btnOff]} onPress={submit} disabled={!ready || busy}>
        <Text style={s.btnText}>
          {busy ? 'Un momento…' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
        </Text>
      </Pressable>

      <Pressable onPress={swap} disabled={busy} style={s.swap}>
        <Text style={s.link}>
          {mode === 'signin' ? 'No tengo cuenta, quiero crear una' : 'Ya tengo cuenta, quiero entrar'}
        </Text>
      </Pressable>

      {mode === 'signin' && (
        <Pressable onPress={forgot} disabled={busy} style={s.swap}>
          <Text style={s.forgot}>Olvidé mi contraseña</Text>
        </Pressable>
      )}

      {!!msg && <Text style={s.msg}>{msg}</Text>}
      {mode === 'signup' && !msg && (
        <Text style={s.hint}>La contraseña necesita al menos {MIN_PASSWORD} caracteres.</Text>
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
  btn: { backgroundColor: T.prot, borderRadius: T.r, padding: 16, alignItems: 'center', marginTop: 4 },
  btnOff: { opacity: 0.4 },
  btnText: { color: T.bg, fontWeight: '700', fontSize: 16 },
  swap: { alignItems: 'center', paddingVertical: 6 },
  link: { color: T.prot, fontSize: 13, fontWeight: '600' },
  forgot: { color: T.dim, fontSize: 13 },
  msg: { color: T.dim, fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  hint: { color: T.dim, fontSize: 12, textAlign: 'center', marginTop: 4, opacity: 0.7 },
});
