// Login con correo y contraseña. Sin correos de por medio: el SMTP integrado
// de Supabase solo entrega a direcciones del equipo del proyecto, así que
// cualquier flujo por correo necesita SMTP propio antes de servir de algo.
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
