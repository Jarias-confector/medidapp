// Login por enlace mágico en nativo. El correo debe regresar a la app,
// no a localhost: Supabase usa el Site URL del proyecto si no le mandamos
// emailRedirectTo, y ese default es http://localhost:3000.
import * as Linking from 'expo-linking';
import { supabase } from './db';

/**
 * URL a la que Supabase debe regresar tras abrir el enlace del correo.
 * En Expo Go sale exp://<ip>:8081/--/login; en build nativo, macros://login.
 * Ambas tienen que estar en la lista de redirect urls del proyecto.
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

export type SignInResult =
  | { status: 'none' }            // la url no traía nada de auth
  | { status: 'ok' }
  | { status: 'error'; message: string };

/**
 * Supabase regresa la sesión de dos formas según el flow del cliente que
 * pidió el enlace: pkce manda ?code=... en el query, e implicit manda
 * #access_token=...&refresh_token=... en el fragmento. Linking.parse solo
 * lee el query, así que aquí juntamos ambos a mano.
 */
function authParams(url: string): URLSearchParams {
  const merged = new URLSearchParams();
  for (const part of url.split(/[?#]/).slice(1)) {
    new URLSearchParams(part).forEach((v, k) => merged.set(k, v));
  }
  return merged;
}

/** Cambia el deep link del correo por una sesión. */
export async function completeSignInFromUrl(url: string): Promise<SignInResult> {
  const p = authParams(url);

  const errorDescription = p.get('error_description') ?? p.get('error');
  if (errorDescription) {
    return { status: 'error', message: describe(p.get('error_code'), errorDescription) };
  }

  // Flow pkce.
  const code = p.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { status: 'error', message: 'El enlace ya no sirve. Pide uno nuevo.' };
    return { status: 'ok' };
  }

  // Flow implicit.
  const access_token = p.get('access_token');
  const refresh_token = p.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) return { status: 'error', message: 'El enlace ya no sirve. Pide uno nuevo.' };
    return { status: 'ok' };
  }

  return { status: 'none' };
}

function describe(code: string | null, fallback: string): string {
  if (code === 'otp_expired') return 'El enlace ya venció. Pide uno nuevo.';
  if (code === 'access_denied') return 'El enlace ya se usó o venció. Pide uno nuevo.';
  return fallback.replace(/\+/g, ' ');
}
