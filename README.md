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

Código de 6 dígitos por correo. No usa deep links, así que no depende de la
lista de redirect urls ni del navegador del cliente de correo.

En Authentication → Emails, la plantilla de **Magic Link** y la de **Confirm
signup** tienen que incluir el token:

```html
<p>Tu código de acceso es:</p>
<p><strong>{{ .Token }}</strong></p>
```

Las plantillas que trae Supabase de fábrica solo llevan `{{ .ConfirmationURL }}`.
Si no agregas `{{ .Token }}`, el correo llega sin código.

El enlace sigue funcionando como respaldo si lo abren en el mismo teléfono. Para
eso el proyecto necesita `macros://login` y `exp://**` en los redirect urls.

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
