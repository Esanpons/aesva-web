/*************** Corrección ortográfica con Google AI ****************/
window.aiConfig = window.aiConfig || { apiKey: '', model: '', languages: [] };

function buildSpellPrompt(text) {
  const langs = aiConfig.languages.join(' y ');
  const langPart = langs ? ' en ' + langs : '';
  return (
    `Corrige únicamente las faltas de ortografía` +
    `${langPart} en el texto siguiente manteniendo todas las palabras y su orden.` +
    ` Devuelve solo el texto completo corregido sin añadir comentarios.` +
    `\n"""${text}"""`
  );
}

async function callGoogleAi(prompt) {
  if (!aiConfig.apiKey || !aiConfig.model) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(aiConfig.model)}:generateContent?key=${encodeURIComponent(aiConfig.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0 }
      })
    });
    const json = await res.json();
    const cand = json.candidates && json.candidates[0];
    if (cand && cand.content && cand.content.parts) {
      return cand.content.parts.map(p => p.text).join('').trim();
    }
  } catch (err) {
    console.error(err);
  }
  return null;
}

async function correctText(text) {
  if (!aiConfig.apiKey || !aiConfig.model) return text;
  if (!text) return text;
  const prompt = buildSpellPrompt(text);
  const result = await callGoogleAi(prompt);
  return result || text;
}

async function correctFieldIfNeeded(table, field, previous, current) {
  if (!aiConfig.apiKey || !aiConfig.model) return current;
  if (previous !== undefined && previous !== null && String(previous) === String(current)) {
    return current;
  }
  return await correctText(current);
}

window.correctFieldIfNeeded = correctFieldIfNeeded;
