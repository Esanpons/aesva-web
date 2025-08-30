window.dbReady = (async () => {
  if (!window.backendConfig) window.backendConfig = { url: '', dbHost: '', dbPort: '5432', dbName: '', dbUser: '', dbPassword: '' };

  await new Promise(res => {
    if (window.backendConfig.url) return res();
    document.addEventListener('backendConfigLoaded', res, { once: true });
  });

  if (!backendConfig.url) {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.openConfigPopup) window.openConfigPopup();
    });
    await new Promise(res => document.addEventListener('configSaved', res, { once: true }));
  }

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

  async function request(path, payload) {
    const headers = { 'Content-Type': 'application/json' };
    if (backendConfig.dbHost) headers['X-DB-Host'] = backendConfig.dbHost;
    if (backendConfig.dbPort) headers['X-DB-Port'] = backendConfig.dbPort;
    if (backendConfig.dbName) headers['X-DB-Name'] = backendConfig.dbName;
    if (backendConfig.dbUser) headers['X-DB-User'] = backendConfig.dbUser;
    if (backendConfig.dbPassword) headers['X-DB-Password'] = backendConfig.dbPassword;
    const res = await fetch(`${backendConfig.url}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
    return res.json();
  }

  window.db = {
    async select(table, filter = {}) {
      const data = await request('/select', { table, filter: decamelKeys(filter) });
      return data.map(camelKeys);
    },
    async insert(table, data) {
      data = sanitizeStrings(data);
      const ret = await request('/insert', { table, data: decamelKeys(data) });
      return camelKeys(ret);
    },
    async update(table, filter, data) {
      data = sanitizeStrings(data);
      const ret = await request('/update', { table, filter: decamelKeys(filter), data: decamelKeys(data) });
      return camelKeys(ret);
    },
    async delete(table, filter) {
      await request('/delete', { table, filter: decamelKeys(filter) });
      return true;
    },
    async selectRange(table, field, start, end) {
      const data = await request('/select-range', { table, field, start, end });
      return data.map(camelKeys);
    }
  };
})();
