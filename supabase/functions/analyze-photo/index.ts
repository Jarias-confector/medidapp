// Deno / Supabase Edge Function. La API key de Gemini NUNCA va en el cliente.
// deploy: supabase functions deploy analyze-photo
// secret: supabase secrets set GEMINI_KEY=...

const MODEL = 'gemini-flash-latest';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = `Eres un analista de nutrición. Identifica los alimentos visibles en la foto.
Estima el peso en gramos de cada uno usando referencias visuales (plato ~26cm, cubiertos, mano).
Responde SOLO con un array JSON, sin markdown, sin texto extra:
[{"nombre":"pechuga de pollo a la plancha","gramos":150,"confianza":0.8}]
Reglas:
- nombre en español, específico, incluye método de cocción.
- separa cada componente del plato, no agrupes.
- confianza entre 0 y 1.
- si no distingues comida, responde [].`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();
    if (!imageBase64) return json({ error: 'Falta imageBase64' }, 400);

    const res = await fetch(`${ENDPOINT}?key=${Deno.env.get('GEMINI_KEY')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
    });

    if (res.status === 429) return json({ error: 'Límite de la IA alcanzado. Intenta en un minuto.' }, 429);
    if (!res.ok) return json({ error: `Gemini ${res.status}` }, 502);

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const items = JSON.parse(raw.replace(/```json|```/g, '').trim());

    return json({ items });
  } catch (e) {
    return json({ error: String(e) }, 500);
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
