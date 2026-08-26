# Macros MX

Contador de macros gratis. Expo + Supabase + APIs abiertas.

## Setup

```bash
npx create-expo-app@latest . --template blank-typescript   # solo si empiezas de cero
npm install
cp .env.example .env    # llena las 2 llaves de Supabase
npx expo start
```

## Llaves

| Qué | Dónde | Costo |
|---|---|---|
| Supabase URL + anon key | supabase.com → Project Settings → API | Free tier |
| USDA | api.data.gov/signup | Gratis, 1000 req/hora (secret en Supabase) |
| Gemini | aistudio.google.com/apikey | Free tier, ~15 RPM / 1500 RPD |
| Open Food Facts | — | Sin key |

## Base de datos

Pega `supabase/schema.sql` en el SQL Editor de Supabase y ejecútalo.

## Edge functions

Las API keys de USDA y Gemini viven aquí, nunca en el cliente.

```bash
supabase functions deploy analyze-photo
supabase functions deploy search-food
supabase secrets set GEMINI_KEY=tu_key USDA_KEY=tu_key
```

**Importante:** usa un proyecto de Google Cloud aparte para producción. Activar
billing en un proyecto borra su free tier de Gemini por completo.

## Login

Correo y contraseña. Entrar y crear cuenta no mandan ningún correo a propósito:
el SMTP integrado de Supabase solo entrega a direcciones que estén en el equipo
del proyecto, así que nada por correo le sirve a un usuario real todavía.

En Authentication → Sign In / Providers, apaga **Confirm email**. Si lo dejas
prendido, `signUp` no devuelve sesión y la app te pide confirmar el correo, que
es justo lo que no podemos mandar.

### Recuperar contraseña

Está armada (`app/reset.tsx`) pero **duerme hasta que configures SMTP propio**,
porque manda un enlace por correo y no hay forma de evitarlo. Mientras tanto, si
alguien olvida su contraseña la cambias tú desde Authentication → Users.

Para prenderla, cuando tengas SMTP (Brevo, Resend, SES):

1. Authentication → Emails → SMTP Settings, con tus credenciales.
2. Authentication → URL Configuration → Redirect URLs: agrega `macros://reset`
   y, si pruebas en Expo Go, `exp://**`.
3. Ya. El código no cambia.

En Expo Go la url del deep link trae la IP de tu máquina y cambia sola; los docs
de expo-linking dicen que ahí no es estable para callbacks de auth. Para probar
esto en serio usa un development build (`npx expo run:android`), donde
`macros://reset` es fijo.

## Reglas del código

- Todos los macros se guardan **por 100 g**. El escalado se hace al mostrar.
- Todo alimento externo se cachea en `foods` al usarlo. Nunca repitas una llamada.
- OFF responde HTTP 200 con `status: 0` si el código no existe. Valida `status`.
- La estimación de gramos por foto falla ±30%. El usuario siempre confirma antes de guardar.

## Siguiente

- [ ] Pantalla de metas (editar kcal/macros)
- [ ] Historial semanal + gráfica
- [ ] Comidas guardadas (recetas repetidas)
- [ ] Modo offline con cola de sincronización
