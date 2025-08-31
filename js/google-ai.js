// Correcciones ortográficas con el conector de Google IA
window.AI_CORRECTION_FIELDS = {
  imputations: ['comments'],
  tasks: ['taskDescription']
};

async function correctTextWithAI(text) {
  if (!window.backendUrl || !window.aiConfig) return text;
  if (!text) return text;
  const langMap = { es: 'Spanish', ca: 'Catalan' };
  const body = { text, lang: langMap[aiConfig.lang] || 'Spanish' };
  try {
    const res = await fetch(`${window.backendUrl.replace(/\/$/, '')}/ai/correct-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return data?.response?.corrected || text;
  } catch (err) {
    console.error(err);
    return text;
  }
}

window.applyAiCorrection = async function (table, data, original = {}) {
  const fields = AI_CORRECTION_FIELDS[table];
  if (!fields) return data;
  for (const f of fields) {
    const val = data[f];
    const prev = original[f] ?? '';
    if (typeof val === 'string' && val.trim() && val !== prev) {
      data[f] = await correctTextWithAI(val);
    }
  }
  return data;
};
