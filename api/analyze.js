// Vercel serverless function — salva questo file come /api/analyze.js
// nella root del tuo progetto (Vercel lo pubblica automaticamente come
// endpoint POST /api/analyze). Netlify/Cloudflare: stessa logica, sintassi
// leggermente diversa per l'export della funzione.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non permesso' });
  }

  // La chiave vive SOLO qui, come variabile d'ambiente sul server.
  // Non è mai visibile al browser dell'utente.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chiave API non configurata sul server' });
  }

  try {
    // Il frontend manda solo { messages, model, max_tokens } — niente chiave.
    const { messages, model, max_tokens } = req.body;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        max_tokens: max_tokens || 1000,
        messages,
      }),
    });

    const data = await anthropicRes.json();
    res.status(anthropicRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore nella chiamata al modello' });
  }
}
