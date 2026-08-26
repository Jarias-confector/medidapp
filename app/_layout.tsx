import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/db';
import { T } from '../lib/theme';
import type { Session } from '@supabase/supabase-js';

export default function Layout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === 'login' || segments[0] === 'reset';
    if (!session && !inAuth) router.replace('/login');
    // De /reset no sacamos aunque ya haya sesión: la de recuperación existe
    // justo para poder guardar la contraseña nueva.
    if (session && segments[0] === 'login') router.replace('/');
  }, [session, ready, segments]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: T.bg },
          headerTintColor: T.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: T.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Hoy' }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="reset" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ title: 'Buscar alimento' }} />
        <Stack.Screen name="scan" options={{ title: 'Escanear código' }} />
        <Stack.Screen name="photo" options={{ title: 'Foto del plato' }} />
        <Stack.Screen name="add" options={{ title: 'Agregar', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
