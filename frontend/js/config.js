/*************** Configuración Backend ****************/
window.backendConfig = { url: '' };
window.aiConfig = { key: '', model: '', lang: 'es' };
window.uiLang = 'es';
let currentConfigBackdrop = null;

function loadBackendConfig() {
  window.backendConfig.url = localStorage.getItem('backendUrl') || '';
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
      const aiKey = form.elements['aiKey'];
      const aiModel = form.elements['aiModel'];
      const aiLang = form.elements['aiLang'];
      const uiLang = form.elements['uiLang'];

      backendUrl.value = localStorage.getItem('backendUrl') || '';
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
        const aiK = aiKey.value.trim();
        const aiM = aiModel.value.trim();
        const aiL = aiLang.value;
        const uiL = uiLang.value;

        if (!url) {
          alert(window.i18n ? i18n.t('Debe introducir URL del backend') : 'Debe introducir URL del backend');
          return;
        }

        localStorage.setItem('backendUrl', url);
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
