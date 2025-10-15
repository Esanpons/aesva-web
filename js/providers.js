/*************** Proveedores (popup externo) ****************/
let currentProvidersBackdrop = null;

const btnProviders = document.getElementById('btnProviders');
if (btnProviders) {
  btnProviders.addEventListener('click', openProvidersPopup);
}

function openProvidersPopup() {
  if (currentProvidersBackdrop) {
    currentProvidersBackdrop.remove();
    currentProvidersBackdrop = null;
  }

  fetch('html/providers.html')
    .then(r => r.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const providersPage = doc.getElementById('providersPage');
      if (window.i18n) i18n.apply(providersPage);

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop providers-popup';
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.appendChild(providersPage);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      currentProvidersBackdrop = backdrop;

      const providersTableBody = backdrop.querySelector('#providersTable tbody');
      const btnAdd = backdrop.querySelector('#BtnAddProvider');
      const btnEdit = backdrop.querySelector('#BtnEditProvider');
      const btnDel = backdrop.querySelector('#BtnDelProvider');
      const closeBtn = backdrop.querySelector('.close');

      function closePopup() {
        backdrop.remove();
        currentProvidersBackdrop = null;
        document.removeEventListener('keydown', handleEsc);
      }

      function handleEsc(e) {
        if (e.key === 'Escape') closePopup();
      }
      document.addEventListener('keydown', handleEsc);

      let selectedProviderCode = providers.length ? providers[0].supplierCode : null;

      function updateButtons() {
        const hasSel = !!selectedProviderCode;
        btnEdit.disabled = !hasSel;
        btnDel.disabled = !hasSel;
      }

      function formatValue(value) {
        return value ? value : '';
      }

      function renderProviders() {
        const sorted = [...providers].sort((a, b) => {
          const aCode = a.supplierCode || '';
          const bCode = b.supplierCode || '';
          return aCode.localeCompare(bCode);
        });
        providersTableBody.innerHTML = '';
        if (selectedProviderCode === null && sorted.length) selectedProviderCode = sorted[0].supplierCode;
        sorted.forEach(p => {
          const tr = document.createElement('tr');
          tr.dataset.code = p.supplierCode || '';
          tr.innerHTML = `
            <td>${formatValue(p.supplierCode)}</td>
            <td>${formatValue(p.name)}</td>
            <td>${formatValue(p.country)}</td>
            <td>${formatValue(p.taxId)}</td>
            <td>${formatValue(p.managerAccountCode)}</td>`;
          if (p.supplierCode === selectedProviderCode) tr.classList.add('selected');
          tr.addEventListener('click', () => {
            selectedProviderCode = p.supplierCode || null;
            renderProviders();
          });
          tr.addEventListener('dblclick', () => {
            openProviderModal(p, code => {
              selectedProviderCode = code;
              renderProviders();
            });
          });
          providersTableBody.appendChild(tr);
        });
        updateButtons();
      }

      btnAdd.addEventListener('click', () => {
        openProviderModal(null, code => {
          selectedProviderCode = code;
          renderProviders();
        });
      });

      btnEdit.addEventListener('click', () => {
        const provider = providers.find(p => p.supplierCode === selectedProviderCode);
        if (provider) {
          openProviderModal(provider, code => {
            selectedProviderCode = code;
            renderProviders();
          });
        }
      });

      btnDel.addEventListener('click', async () => {
        if (!selectedProviderCode) return;
        if (!confirm(i18n.t('¿Eliminar proveedor?'))) return;
        try {
          await db.delete('providers', { supplier_code: selectedProviderCode });
          await loadProviders();
          if (providers.length) {
            selectedProviderCode = providers[0].supplierCode;
          } else {
            selectedProviderCode = null;
          }
          renderProviders();
        } catch (err) {
          console.error(err);
          alert(i18n.t('Error al eliminar el proveedor'));
        }
      });

      closeBtn.addEventListener('click', closePopup);

      renderProviders();
    });
}

function openProviderModal(provider = null, onSave) {
  const tmpl = (currentProvidersBackdrop || document).querySelector('#providerModalTmpl');
  if (!tmpl) return;
  const clone = tmpl.content.cloneNode(true);
  const backdrop = clone.querySelector('.modal-backdrop');
  const form = clone.querySelector('#providerForm');

  if (provider) {
    Object.entries(provider).forEach(([k, v]) => {
      if (form.elements[k] != null) form.elements[k].value = v || '';
    });
    const title = backdrop.querySelector('.modal-title');
    if (title) title.textContent = i18n.t('Editar proveedor');
    if (form.elements.supplierCode) form.elements.supplierCode.readOnly = true;
  }

  function closeModal() {
    backdrop.remove();
    document.removeEventListener('keydown', handleEsc, true);
  }

  function handleEsc(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeModal();
    }
  }

  document.addEventListener('keydown', handleEsc, true);
  backdrop.querySelector('.close').addEventListener('click', closeModal);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = sanitizeStrings(Object.fromEntries(formData.entries()));
    data.supplierCode = (data.supplierCode || '').trim();
    data.name = (data.name || '').trim();
    data.country = (data.country || '').trim();
    data.taxId = (data.taxId || '').trim();
    data.managerAccountCode = (data.managerAccountCode || '').trim();

    if (!data.supplierCode) {
      alert(i18n.t('El código del proveedor es obligatorio'));
      return;
    }
    if (!data.name) {
      alert(i18n.t('El nombre del proveedor es obligatorio'));
      return;
    }

    try {
      if (provider) {
        await db.update('providers', { supplier_code: provider.supplierCode }, data);
      } else {
        await db.insert('providers', data);
      }
      await loadProviders();
      closeModal();
      if (onSave) onSave(data.supplierCode);
    } catch (err) {
      console.error(err);
      alert(i18n.t('Error al guardar el proveedor'));
    }
  });

  (currentProvidersBackdrop || document.body).appendChild(clone);
}

window.openProvidersPopup = openProvidersPopup;
