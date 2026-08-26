import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import {
  sendLoginCode,
  verifyLoginCode,
  completeSignInFromUrl,
  authRedirectUrl,
} from '../lib/auth';
import { T } from '../lib/theme';

const CODE_LENGTH = 6;

export default function Login() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const url = Linking.useURL();
  const handled = useRef<string | null>(null);

  // Si abren el enlace del correo en vez de teclear el código, también entra.
  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;
    setBusy(true);
    completeSignInFromUrl(url)
      .then((res) => {
        if (res.status === 'error') setMsg(res.message);
        // 'none' es normal: la app también se abre por deep links sin auth.
      })
      .finally(() => setBusy(false));
  }, [url]);

  async function send() {
    setBusy(true); setMsg('');
    try {
      await sendLoginCode(email);
      setCode('');
      setStep('code');
      setMsg(`Te mandamos un código de ${CODE_LENGTH} dígitos a ${email.trim()}.`);
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo enviar el código. Intenta de nuevo.');
    }
    setBusy(false);
  }

  async function verify(value: string) {
    setBusy(true); setMsg('');
    try {
      await verifyLoginCode(email, value);
      // El listener de sesión en _layout se encarga de sacarnos de aquí.
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo validar el código. Intenta de nuevo.');
      setCode('');
      setBusy(false);
    }
  }

  function onCodeChange(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH && !busy) verify(digits);
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Macros</Text>
      <Text style={s.sub}>Registra lo que comes. Sin suscripción.</Text>

      {step === 'email' ? (
        <>
          <TextInput
            style={s.input}
            placeholder="tu@correo.com"
            placeholderTextColor={T.dim}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable style={s.btn} onPress={send} disabled={busy || !email.includes('@')}>
            <Text style={s.btnText}>{busy ? 'Enviando…' : 'Enviar código'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={[s.input, s.code]}
            placeholder="000000"
            placeholderTextColor={T.line}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            value={code}
            onChangeText={onCodeChange}
            editable={!busy}
            autoFocus
          />
          <Pressable
            style={s.btn}
            onPress={() => verify(code)}
            disabled={busy || code.length !== CODE_LENGTH}
          >
            <Text style={s.btnText}>{busy ? 'Validando…' : 'Entrar'}</Text>
          </Pressable>
          <View style={s.links}>
            <Pressable onPress={send} disabled={busy}>
              <Text style={s.link}>Reenviar código</Text>
            </Pressable>
            <Pressable
              onPress={() => { setStep('email'); setCode(''); setMsg(''); }}
              disabled={busy}
            >
              <Text style={s.link}>Cambiar correo</Text>
            </Pressable>
          </View>
        </>
      )}

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
  code: { fontSize: 30, fontWeight: '700', textAlign: 'center', letterSpacing: 10 },
  btn: { backgroundColor: T.prot, borderRadius: T.r, padding: 16, alignItems: 'center' },
  btnText: { color: T.bg, fontWeight: '700', fontSize: 16 },
  links: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
  link: { color: T.prot, fontSize: 13, fontWeight: '600' },
  msg: { color: T.dim, fontSize: 13, textAlign: 'center', marginTop: 8 },
  debug: { color: T.dim, fontSize: 11, textAlign: 'center', marginTop: 20, opacity: 0.7 },
});
