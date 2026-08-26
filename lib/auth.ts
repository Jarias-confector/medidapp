// Login con correo y contraseña. Entrar y crear cuenta no mandan ningún
// correo a propósito: el SMTP integrado de Supabase solo entrega a
// direcciones del equipo del proyecto.
//
// Recuperar la contraseña sí necesita correo, no hay forma de evitarlo. Queda
// armado y en cuanto configures SMTP propio empieza a funcionar solo.
import * as Linking from 'expo-linking';
import { supabase } from './db';

export type SignUpResult =
  | { status: 'ok' }                      // entró directo
  | { status: 'needs_confirmation' };     // falta confirmar el correo

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: normalize(email),
    password,
  });
  if (error) throw new Error(describeAuthError(error.message));
}

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: normalize(email),
    password,
  });
  if (error) throw new Error(describeAuthError(error.message));
  // Con "Confirm email" prendido, signUp no falla pero tampoco da sesión.
  return data.session ? { status: 'ok' } : { status: 'needs_confirmation' };
}

export async function signOut() {
  await supabase.auth.signOut();
}

// --- Recuperar contraseña ---

/** A dónde debe regresar el enlace del correo de recuperación. */
export function resetRedirectUrl(): string {
  return Linking.createURL('/reset');
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(normalize(email), {
    redirectTo: resetRedirectUrl(),
  });
  if (error) throw new Error(describeAuthError(error.message));
}

export type RecoveryResult =
  | { status: 'ok' }
  | { status: 'none' }
  | { status: 'error'; message: string };

/**
 * Supabase manda la sesión de recuperación de dos formas según el flow: pkce
 * pone ?code=... en el query, implicit pone #access_token=... en el fragmento.
 * Linking.parse solo lee el query, así que juntamos ambos a mano.
 */
function authParams(url: string): URLSearchParams {
  const merged = new URLSearchParams();
  for (const part of url.split(/[?#]/).slice(1)) {
    new URLSearchParams(part).forEach((v, k) => merged.set(k, v));
  }
  return merged;
}

/** Cambia el deep link del correo por una sesión de recuperación. */
export async function completeRecoveryFromUrl(url: string): Promise<RecoveryResult> {
  const p = authParams(url);

  const described = p.get('error_description') ?? p.get('error');
  if (described) {
    return { status: 'error', message: describeLinkError(p.get('error_code'), described) };
  }

  const code = p.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { status: 'error', message: 'El enlace ya no sirve. Pide uno nuevo.' };
    return { status: 'ok' };
  }

  const access_token = p.get('access_token');
  const refresh_token = p.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) return { status: 'error', message: 'El enlace ya no sirve. Pide uno nuevo.' };
    return { status: 'ok' };
  }

  return { status: 'none' };
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(describeAuthError(error.message));
}

function describeLinkError(code: string | null, fallback: string): string {
  if (code === 'otp_expired') return 'El enlace ya venció. Pide uno nuevo.';
  if (code === 'access_denied') return 'El enlace ya se usó o venció. Pide uno nuevo.';
  return fallback.replace(/\+/g, ' ');
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function describeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Ese correo ya tiene cuenta. Entra con tu contraseña.';
  }
  if (m.includes('email not confirmed')) {
    return 'Falta confirmar tu correo antes de entrar.';
  }
  if (m.includes('same as the old') || m.includes('should be different')) {
    return 'Esa ya es tu contraseña. Escribe una distinta.';
  }
  if (m.includes('password should be at least')) {
    const n = m.match(/at least (\d+)/);
    return `La contraseña necesita al menos ${n ? n[1] : 6} caracteres.`;
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Demasiados intentos. Espera un minuto.';
  }
  const wait = m.match(/after (\d+) seconds?/);
  if (wait) return `Espera ${wait[1]} segundos antes de intentar de nuevo.`;
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'Ese correo no es válido.';
  }
  return message;
}
