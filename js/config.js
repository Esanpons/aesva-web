/*** Configuración Backend ***/
window.backendUrl = '';
window.aiConfig = { lang: 'es' };
window.uiLang = 'es';
let currentConfigBackdrop = null;

function loadBackendUrl() {
  const env = localStorage.getItem('backendEnv') || 'real';
  const url = localStorage.getItem(env === 'real' ? 'backendUrlReal' : 'backendUrlTest') || '';
  window.backendUrl = url;
  document.dispatchEvent(new Event('backendLoaded'));
}

function loadAiConfig() {
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
      const envSel = form.elements['environment'];
      const urlReal = form.elements['backendUrlReal'];
      const urlTest = form.elements['backendUrlTest'];
      const realBlock = form.querySelector('#realFields');
      const testBlock = form.querySelector('#testFields');
      const aiLang = form.elements['aiLang'];
      const uiLang = form.elements['uiLang'];

      function updateFields() {
        const env = envSel.value;
        if (env === 'real') {
          realBlock.classList.remove('hidden');
          testBlock.classList.add('hidden');
          urlReal.required = true;
          urlTest.required = false;
          urlReal.value = localStorage.getItem('backendUrlReal') || '';
        } else {
          realBlock.classList.add('hidden');
          testBlock.classList.remove('hidden');
          urlTest.required = true;
          urlReal.required = false;
          urlTest.value = localStorage.getItem('backendUrlTest') || '';
        }
      }

      envSel.value = localStorage.getItem('backendEnv') || 'real';
      updateFields();
      envSel.addEventListener('change', updateFields);
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
        const env = envSel.value;
        const urlR = urlReal.value.trim();
        const urlT = urlTest.value.trim();
        const aiL = aiLang.value;
        const uiL = uiLang.value;

        if (env === 'real' && !urlR) {
          alert(i18n.t('Debe introducir URL de Real'));
          return;
        }
        if (env === 'test' && !urlT) {
          alert(i18n.t('Debe introducir URL de Test'));
          return;
        }

        localStorage.setItem('backendEnv', env);
        if (urlR) localStorage.setItem('backendUrlReal', urlR);
        if (urlT) localStorage.setItem('backendUrlTest', urlT);
        localStorage.setItem('aiLang', aiL);
        localStorage.setItem('uiLang', uiL);

        loadBackendUrl();
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

function updateEnvLabel() {
  const label = document.getElementById('envLabel');
  if (!label) return;
  const env = localStorage.getItem('backendEnv') || 'real';
  if (env === 'test') {
    label.textContent = 'TEST';
    label.classList.add('test');
  } else {
    label.textContent = '';
    label.classList.remove('test');
  }
}
document.addEventListener('DOMContentLoaded', () => { loadBackendUrl(); loadAiConfig(); loadUiLang(); updateEnvLabel(); });
document.addEventListener('configSaved', () => { loadBackendUrl(); loadAiConfig(); loadUiLang(); updateEnvLabel(); });
window.updateEnvLabel = updateEnvLabel;
