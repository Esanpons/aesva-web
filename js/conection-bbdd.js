// Conexión con backend REST
window.dbReady = (async () => {
  await new Promise(res => {
    if (window.backendUrl) return res();
    document.addEventListener('backendLoaded', res, { once: true });
  });

  const baseUrl = () => (window.backendUrl || '').replace(/\/$/, '');

  const tableMap = {
    week_config: 'week-config',
    calendar_days: 'calendar',
    invoice_lines: 'invoice-lines',
    company: 'companies'
  };
  const pathFor = tbl => tableMap[tbl] || tbl;

  const camel = str => str.replace(/_([a-z])/g, (m, g) => g.toUpperCase());
  const decamel = str => str.replace(/([A-Z])/g, m => '_' + m.toLowerCase());
  const camelKeys = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [camel(k), v]));
  const decamelKeys = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [decamel(k), v]));
  const sanitizeStrings = o => {
    const out = {};
    Object.entries(o).forEach(([k, v]) => {
      out[k] = typeof v === 'string' ? v : v;
    });
    return out;
  };
  window.sanitizeStrings = sanitizeStrings;

  async function fetchJson(url, opts = {}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || res.statusText);
    return data;
  }

  window.db = {
    async select(table, filter = {}) {
      const params = new URLSearchParams(decamelKeys(filter));
      const url = `${baseUrl()}/${pathFor(table)}${params.toString() ? `?${params}` : ''}`;
      const data = await fetchJson(url);
      const rows = Array.isArray(data.response) ? data.response : [data.response];
      return rows.map(camelKeys);
    },
    async insert(table, data) {
      data = sanitizeStrings(data);
      const url = `${baseUrl()}/${pathFor(table)}`;
      const body = JSON.stringify(decamelKeys(data));
      const ret = await fetchJson(url, { method: 'POST', body });
      return camelKeys(ret.response);
    },
    async update(table, filter, data) {
      data = sanitizeStrings(data);
      const [k, v] = Object.entries(filter)[0];
      const url = `${baseUrl()}/${pathFor(table)}/${encodeURIComponent(v)}`;
      const body = JSON.stringify(decamelKeys(data));
      const ret = await fetchJson(url, { method: 'PUT', body });
      return camelKeys(ret.response);
    },
    async delete(table, filter) {
      const [k, v] = Object.entries(filter)[0];
      const path = pathFor(table);
      const pkFields = ['id', 'no', 'date', 'weekday'];
      if (pkFields.includes(k)) {
        const url = `${baseUrl()}/${path}/${encodeURIComponent(v)}`;
        await fetchJson(url, { method: 'DELETE' });
        return true;
      }
      const rows = await this.select(table, { [k]: v });
      for (const r of rows) {
        const pk = pkFields.find(p => p in r);
        if (pk) await this.delete(table, { [pk]: r[pk] });
      }
      return true;
    },
    async selectRange(table, field, start, end) {
      const params = {};
      if (start !== undefined) params.start = start;
      if (end !== undefined) params.end = end;
      return this.select(table, params);
    }
  };
})();
