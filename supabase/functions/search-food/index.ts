// Deno / Supabase Edge Function. La API key de USDA NUNCA va en el cliente.
// deploy: supabase functions deploy search-food
// secret: supabase secrets set USDA_KEY=...

const ENDPOINT = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const DATA_TYPES = 'Foundation,SR Legacy,Survey (FNDDS)';
const PAGE_SIZE = 20;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { q } = await req.json();
    if (typeof q !== 'string' || q.trim().length < 2) {
      return json({ error: 'Escribe al menos dos letras para buscar.' }, 400);
    }

    const key = Deno.env.get('USDA_KEY');
    if (!key) return json({ error: 'Falta la llave de USDA en el servidor.' }, 500);

    const url =
      `${ENDPOINT}?api_key=${encodeURIComponent(key)}` +
      `&query=${encodeURIComponent(q.trim())}` +
      `&dataType=${encodeURIComponent(DATA_TYPES)}` +
      `&pageSize=${PAGE_SIZE}`;

    const res = await fetch(url);

    if (res.status === 429) {
      return json({ error: 'Límite de búsquedas alcanzado. Intenta en un minuto.' }, 429);
    }
    if (!res.ok) {
      return json({ error: `No se pudo buscar en USDA (${res.status}).` }, 502);
    }

    // JSON crudo de USDA: el mapeo de nutrientes se hace en el cliente.
    return json(await res.json());
  } catch (_e) {
    return json({ error: 'Falló la búsqueda. Intenta de nuevo.' }, 500);
  }
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
