# Macros MX

Contador de macros gratis. Expo + Supabase + APIs abiertas.

## Setup

```bash
npx create-expo-app@latest . --template blank-typescript   # solo si empiezas de cero
npm install
cp .env.example .env    # llena las 3 llaves
npx expo start
```

## Llaves

| Qué | Dónde | Costo |
|---|---|---|
| Supabase URL + anon key | supabase.com → Project Settings → API | Free tier |
| USDA | api.data.gov/signup | Gratis, 1000 req/hora |
| Gemini | aistudio.google.com/apikey | Free tier, ~15 RPM / 1500 RPD |
| Open Food Facts | — | Sin key |

## Base de datos

Pega `supabase/schema.sql` en el SQL Editor de Supabase y ejecútalo.

## Edge function

```bash
supabase functions deploy analyze-photo
supabase secrets set GEMINI_KEY=tu_key
```

**Importante:** usa un proyecto de Google Cloud aparte para producción. Activar
billing en un proyecto borra su free tier de Gemini por completo.

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
