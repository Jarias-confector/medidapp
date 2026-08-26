import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase, syncOfflineQueue } from '../lib/db';
import { T } from '../lib/theme';
import type { Session } from '@supabase/supabase-js';

export default function Layout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        const { data: anonData, error } = await supabase.auth.signInAnonymously();
        if (!error && anonData.session) {
          setSession(anonData.session);
        }
      } else {
        setSession(data.session);
      }
      setReady(true);
      syncOfflineQueue();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) syncOfflineQueue();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
        <Stack.Screen name="search" options={{ title: 'Buscar alimento' }} />
        <Stack.Screen name="scan" options={{ title: 'Escanear código' }} />
        <Stack.Screen name="photo" options={{ title: 'Foto del plato' }} />
        <Stack.Screen name="goals" options={{ title: 'Metas diarias', presentation: 'modal' }} />
        <Stack.Screen name="custom" options={{ title: 'Crear alimento', presentation: 'modal' }} />
        <Stack.Screen name="recipe" options={{ title: 'Crear menú/receta', presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ title: 'Historial Semanal' }} />
        <Stack.Screen name="add" options={{ title: 'Agregar', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
