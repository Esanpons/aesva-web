/*************** Configuración Backend ****************/
window.backendConfig = { url: '', dbHost: '', dbPort: '5432', dbName: '', dbUser: '', dbPassword: '' };
window.aiConfig = { key: '', model: '', lang: 'es' };
window.uiLang = 'es';
let currentConfigBackdrop = null;

function loadBackendConfig() {
  window.backendConfig.url = localStorage.getItem('backendUrl') || '';
  window.backendConfig.dbHost = localStorage.getItem('dbHost') || '';
  window.backendConfig.dbPort = localStorage.getItem('dbPort') || '5432';
  window.backendConfig.dbName = localStorage.getItem('dbName') || '';
  window.backendConfig.dbUser = localStorage.getItem('dbUser') || '';
  window.backendConfig.dbPassword = localStorage.getItem('dbPassword') || '';
  document.dispatchEvent(new Event('backendConfigLoaded'));
}

function loadAiConfig() {
  window.aiConfig.key = localStorage.getItem('aiKey') || '';
  window.aiConfig.model = localStorage.getItem('aiModel') || '';
  window.aiConfig.lang = localStorage.getItem('aiLang') || 'es';
  document.dispatchEvent(new Event('aiConfigLoaded'));
}

function loadUiLang() {
  window.uiLang = localStorage.getItem('uiLang') || 'es';
  if (window.i18n) i18n.setLang(window.uiLang);
}

function openConfigPopup() {
  if (currentConfigBackdrop) { currentConfigBackdrop.remove(); currentConfigBackdrop = null; }

  fetch('html/config.html')
    .then(r => r.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const page = doc.getElementById('configPage');
      if (window.i18n) i18n.apply(page);
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.appendChild(page);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      currentConfigBackdrop = backdrop;

      const form = backdrop.querySelector('#configForm');
      const backendUrl = form.elements['backendUrl'];
      const dbHost = form.elements['dbHost'];
      const dbPort = form.elements['dbPort'];
      const dbName = form.elements['dbName'];
      const dbUser = form.elements['dbUser'];
      const dbPassword = form.elements['dbPassword'];
      const aiKey = form.elements['aiKey'];
      const aiModel = form.elements['aiModel'];
      const aiLang = form.elements['aiLang'];
      const uiLang = form.elements['uiLang'];

      backendUrl.value = localStorage.getItem('backendUrl') || '';
      dbHost.value = localStorage.getItem('dbHost') || '';
      dbPort.value = localStorage.getItem('dbPort') || '5432';
      dbName.value = localStorage.getItem('dbName') || '';
      dbUser.value = localStorage.getItem('dbUser') || '';
      dbPassword.value = localStorage.getItem('dbPassword') || '';
      aiKey.value = localStorage.getItem('aiKey') || '';
      aiModel.value = localStorage.getItem('aiModel') || '';
      aiLang.value = localStorage.getItem('aiLang') || 'es';
      uiLang.value = localStorage.getItem('uiLang') || 'es';

      function closePopup() {
        backdrop.remove();
        currentConfigBackdrop = null;
        document.removeEventListener('keydown', handleEsc);
        location.reload();
      }
      function handleEsc(e) { if (e.key === 'Escape') closePopup(); }
      document.addEventListener('keydown', handleEsc);
      backdrop.querySelector('.close').addEventListener('click', closePopup);

      form.addEventListener('submit', e => {
        e.preventDefault();
        const url = backendUrl.value.trim();
        const dbH = dbHost.value.trim();
        const dbP = dbPort.value.trim();
        const dbN = dbName.value.trim();
        const dbU = dbUser.value.trim();
        const dbPw = dbPassword.value.trim();
        const aiK = aiKey.value.trim();
        const aiM = aiModel.value.trim();
        const aiL = aiLang.value;
        const uiL = uiLang.value;

        if (!url || !dbH || !dbN || !dbU) {
          alert(window.i18n ? i18n.t('Debe completar los datos de conexión') : 'Debe completar los datos de conexión');
          return;
        }

        localStorage.setItem('backendUrl', url);
        localStorage.setItem('dbHost', dbH);
        localStorage.setItem('dbPort', dbP || '5432');
        localStorage.setItem('dbName', dbN);
        localStorage.setItem('dbUser', dbU);
        localStorage.setItem('dbPassword', dbPw);
        if (aiK) localStorage.setItem('aiKey', aiK); else localStorage.removeItem('aiKey');
        if (aiM) localStorage.setItem('aiModel', aiM); else localStorage.removeItem('aiModel');
        localStorage.setItem('aiLang', aiL);
        localStorage.setItem('uiLang', uiL);

        loadBackendConfig();
        loadAiConfig();
        loadUiLang();
        document.dispatchEvent(new Event('configSaved'));
        closePopup();
      });
    });
}

if (document.getElementById('btnConfig'))
  document.getElementById('btnConfig').addEventListener('click', openConfigPopup);

window.openConfigPopup = openConfigPopup;

document.addEventListener('DOMContentLoaded', () => { loadBackendConfig(); loadAiConfig(); loadUiLang(); });
document.addEventListener('configSaved', () => { loadBackendConfig(); loadAiConfig(); loadUiLang(); });
