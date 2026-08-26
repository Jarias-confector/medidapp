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

Correo y contraseña. A propósito no usa correos: el SMTP integrado de Supabase
solo entrega a direcciones que estén en el equipo del proyecto, así que
cualquier flujo por correo (enlace mágico, código, recuperar contraseña) no le
sirve a un usuario real hasta que configures SMTP propio.

En Authentication → Sign In / Providers, apaga **Confirm email**. Si lo dejas
prendido, `signUp` no devuelve sesión y la app te pide confirmar el correo, que
es justo lo que no podemos mandar todavía.

Cuando pongas SMTP propio (Brevo, Resend, SES) puedes volver a prender la
confirmación y agregar "olvidé mi contraseña" con `resetPasswordForEmail`.

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
