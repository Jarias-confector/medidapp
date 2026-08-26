// Login por enlace mágico en nativo. El correo debe regresar a la app,
// no a localhost: Supabase usa el Site URL del proyecto si no le mandamos
// emailRedirectTo, y ese default es http://localhost:3000.
import * as Linking from 'expo-linking';
import { supabase } from './db';

/**
 * URL a la que Supabase debe regresar tras abrir el enlace del correo.
 * En Expo Go sale exp://<ip>:8081/--/login; en build nativo, macros://login.
 * Ambas tienen que estar en la lista de redirect URLs del proyecto.
 */
export function authRedirectUrl(): string {
  return Linking.createURL('/login');
}

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: authRedirectUrl() },
  });
  if (error) throw error;
}

/**
 * Cambia el ?code=... del deep link por una sesión. Devuelve el mensaje de
 * error en español, o null si entró bien o si la URL no traía nada de auth.
 */
export async function completeSignInFromUrl(url: string): Promise<string | null> {
  const { queryParams } = Linking.parse(url);

  const errorDescription = queryParams?.error_description;
  if (typeof errorDescription === 'string') return errorDescription;

  const code = queryParams?.code;
  if (typeof code !== 'string') return null;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return 'El enlace ya no sirve. Pide uno nuevo.';
  return null;
}
