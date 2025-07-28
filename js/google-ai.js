/*************** Corrección ortográfica con Google AI ****************/
window.aiConfig = window.aiConfig || { apiKey: '', model: '', language: 'es' };

function buildSpellPrompt(text) {
  const lang = aiConfig.language;
  const langPart = lang ? ' en ' + lang : '';
  return (
    `Corrige únicamente las faltas de ortografía` +
    `${langPart} en el texto siguiente manteniendo todas las palabras y su orden.` +
    ` Devuelve solo el texto completo corregido sin añadir comentarios.` +
    `\n"""${text}"""`
  );
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callGoogleAi(prompt, retries = 3) {
  if (!aiConfig.apiKey || !aiConfig.model) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(aiConfig.model)}:generateContent?key=${encodeURIComponent(aiConfig.apiKey)}`;

  function parseRetryDelay(info, hdr) {
    if (info && typeof info === 'string' && /s$/.test(info)) {
      const ms = parseFloat(info.replace('s', '')) * 1000;
      if (!Number.isNaN(ms)) return ms;
    }
    const h = Number(hdr);
    return !Number.isNaN(h) && h > 0 ? h * 1000 : null;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0 }
        })
      });

      if (res.status === 429) {
        let delay = null;
        try {
          const data = await res.clone().json();
          const detail = data?.error?.details?.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
          if (detail?.retryDelay) delay = parseRetryDelay(detail.retryDelay, res.headers.get('Retry-After'));
        } catch {}
        if (!delay) delay = parseRetryDelay(null, res.headers.get('Retry-After')) || 0;
        if (delay && i < retries - 1) {
          console.warn('Google AI rate limit, retrying in', delay, 'ms');
          await sleep(delay);
          continue;
        }
        console.error('Google AI error', res.status, await res.text());
        return null;
      }

      if (!res.ok) {
        console.error('Google AI error', res.status, await res.text());
        return null;
      }

      const json = await res.json();
      const cand = json.candidates && json.candidates[0];
      if (cand && cand.content && cand.content.parts) {
        return cand.content.parts.map(p => p.text).join('').trim();
      }
      return null;
    } catch (err) {
      console.error(err);
      if (i < retries - 1) await sleep(1000 * (i + 1));
    }
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

async function correctRecordsSequential(records, table, field, delayMs = 1200) {
  if (!aiConfig.apiKey || !aiConfig.model) return;
  for (const rec of records) {
    const original = rec[field] || '';
    const fixed = await correctText(original);
    if (fixed && fixed !== original) {
      try {
        await db.update(table, { id: rec.id }, { [field]: fixed });
        rec[field] = fixed;
      } catch (err) {
        console.error(err);
      }
    }
    if (delayMs) await sleep(delayMs);
  }
}

window.correctRecordsSequential = correctRecordsSequential;
