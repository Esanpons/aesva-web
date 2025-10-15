/*************** Gastos (popup externo) ****************/
let currentExpensesBackdrop = null;

const escapeHtml = value => (value == null)
  ? ''
  : String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

const findProviderByCode = code => {
  if (!code) return null;
  const normalized = String(code).trim().toLowerCase();
  if (!normalized) return null;
  return (window.providers || []).find(p => String(p.supplierCode || '').trim().toLowerCase() === normalized) || null;
};

const computeQuarterFromDate = dateStr => {
  if (!dateStr) return '';
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateStr);
  if (!match) return '';
  const month = parseInt(match[2], 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) return '';
  return Math.floor((month - 1) / 3) + 1;
};

const ensureProvidersLoaded = () => {
  if (window.providers && window.providers.length) return Promise.resolve();
  if (typeof window.loadProviders === 'function') {
    return window.loadProviders().catch(err => {
      console.error(err);
    });
  }
  return Promise.resolve();
};

const btnExpenses = document.getElementById('btnExpenses');
if (btnExpenses) {
  btnExpenses.addEventListener('click', openExpensesPopup);
}

function openExpensesPopup() {
  if (currentExpensesBackdrop) {
    currentExpensesBackdrop.remove();
    currentExpensesBackdrop = null;
  }

  fetch('html/expenses.html')
    .then(r => r.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const expensesPage = doc.getElementById('expensesPage');
      if (window.i18n) i18n.apply(expensesPage);

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop expenses-popup';
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.appendChild(expensesPage);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      currentExpensesBackdrop = backdrop;

      const expensesTableBody = backdrop.querySelector('#expensesTable tbody');
      const btnAdd = backdrop.querySelector('#BtnAddExpense');
      const btnEdit = backdrop.querySelector('#BtnEditExpense');
      const btnDel = backdrop.querySelector('#BtnDelExpense');
      const closeBtn = backdrop.querySelector('.close');

      function closePopup() {
        backdrop.remove();
        currentExpensesBackdrop = null;
        document.removeEventListener('keydown', handleEsc);
      }

      function handleEsc(e) {
        if (e.key === 'Escape') closePopup();
      }
      document.addEventListener('keydown', handleEsc);

      let selectedEntryNo = expenses.length ? expenses[0].entryNo : null;

      function updateButtons() {
        const hasSel = selectedEntryNo != null;
        btnEdit.disabled = !hasSel;
        btnDel.disabled = !hasSel;
      }

      const amountFormatter = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      function formatAmount(value) {
        const num = Number.parseFloat(value);
        return Number.isFinite(num) ? amountFormatter.format(num) : '0,00';
      }

      function renderExpenses() {
        const sorted = [...expenses].sort((a, b) => {
          const aDate = a.invoiceDate || '';
          const bDate = b.invoiceDate || '';
          if (aDate === bDate) return (a.entryNo || 0) - (b.entryNo || 0);
          return aDate < bDate ? 1 : -1; // latest first
        });
        expensesTableBody.innerHTML = '';
        if ((selectedEntryNo == null) && sorted.length) selectedEntryNo = sorted[0].entryNo;
        sorted.forEach(expense => {
          const tr = document.createElement('tr');
          tr.dataset.entryNo = expense.entryNo;
          const invoiceDate = expense.invoiceDate || '';
          const taxBaseDisplay = expense.taxableBase == null ? '' : formatAmount(expense.taxableBase);
          const vatDisplay = expense.vatRate == null ? '' : formatAmount(expense.vatRate);
          const provider = findProviderByCode(expense.supplierCode);
          const providerName = provider && provider.name ? escapeHtml(provider.name) : '';
          const supplierCode = escapeHtml(expense.supplierCode || '');
          const invoiceNumber = escapeHtml(expense.invoiceNumber || '');
          const invoiceDateText = escapeHtml(invoiceDate);
          const quarterText = expense.quarter != null ? escapeHtml(expense.quarter) : '';
          const providerLabel = providerName ? `<span class="table-subtext">${providerName}</span>` : '';
          tr.innerHTML = `
            <td>${supplierCode}${providerLabel}</td>
            <td>${invoiceNumber}</td>
            <td>${invoiceDateText}</td>
            <td class="numeric">${taxBaseDisplay}</td>
            <td class="numeric">${vatDisplay}</td>
            <td>${quarterText}</td>`;
          if (expense.entryNo === selectedEntryNo) tr.classList.add('selected');
          tr.addEventListener('click', () => {
            selectedEntryNo = expense.entryNo;
            renderExpenses();
          });
          tr.addEventListener('dblclick', () => {
            openExpenseModal(expense, entryNo => {
              selectedEntryNo = entryNo;
              renderExpenses();
            });
          });
          expensesTableBody.appendChild(tr);
        });
        updateButtons();
      }

      btnAdd.addEventListener('click', () => {
        openExpenseModal(null, entryNo => {
          selectedEntryNo = entryNo;
          renderExpenses();
        });
      });

      btnEdit.addEventListener('click', () => {
        const expense = expenses.find(e => e.entryNo === selectedEntryNo);
        if (expense) {
          openExpenseModal(expense, entryNo => {
            selectedEntryNo = entryNo;
            renderExpenses();
          });
        }
      });

      btnDel.addEventListener('click', async () => {
        if (selectedEntryNo == null) return;
        if (!confirm(i18n.t('¿Eliminar gasto?'))) return;
        try {
          await db.delete('expenses', { entry_no: selectedEntryNo });
          await loadExpenses();
          if (expenses.length) {
            selectedEntryNo = expenses[0].entryNo;
          } else {
            selectedEntryNo = null;
          }
          renderExpenses();
        } catch (err) {
          console.error(err);
          alert(i18n.t('Error al eliminar el gasto'));
        }
      });

      closeBtn.addEventListener('click', closePopup);

      renderExpenses();
      ensureProvidersLoaded().then(renderExpenses);
    });
}

function openExpenseModal(expense = null, onSave) {
  const tmpl = (currentExpensesBackdrop || document).querySelector('#expenseModalTmpl');
  if (!tmpl) return;
  const clone = tmpl.content.cloneNode(true);
  const backdrop = clone.querySelector('.modal-backdrop');
  const form = clone.querySelector('#expenseForm');

  const supplierInput = form.elements.supplierCode;
  const supplierList = clone.querySelector('#expenseSupplierCodes');
  const supplierPreview = form.querySelector('[data-provider-display]');
  const invoiceDateInput = form.elements.invoiceDate;
  const quarterSelect = form.elements.quarter;

  const updateSupplierPreview = () => {
    if (!supplierPreview) return;
    const provider = findProviderByCode(supplierInput ? supplierInput.value : '');
    if (provider) {
      const parts = [];
      if (provider.name) parts.push(provider.name);
      if (provider.country) parts.push(provider.country);
      if (provider.taxId) parts.push(provider.taxId);
      supplierPreview.textContent = parts.join(' · ');
    } else {
      supplierPreview.textContent = '';
    }
  };

  const populateSupplierOptions = () => {
    if (!supplierList) return;
    supplierList.innerHTML = '';
    const list = [...(window.providers || [])]
      .filter(p => p && p.supplierCode)
      .sort((a, b) => String(a.supplierCode).localeCompare(String(b.supplierCode)));
    list.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.supplierCode;
      const parts = [];
      if (provider.name) parts.push(provider.name);
      if (provider.country) parts.push(provider.country);
      option.label = parts.join(' · ');
      option.textContent = parts.length ? `${provider.supplierCode} — ${parts.join(' · ')}` : provider.supplierCode;
      supplierList.appendChild(option);
    });
  };

  const autoFillQuarterIfEmpty = () => {
    if (!quarterSelect || !invoiceDateInput) return;
    if (quarterSelect.value) return;
    const computed = computeQuarterFromDate(invoiceDateInput.value);
    if (computed) quarterSelect.value = String(computed);
  };

  if (expense) {
    Object.entries(expense).forEach(([k, v]) => {
      if (form.elements[k] != null) {
        if (k === 'taxableBase' || k === 'vatRate') {
          form.elements[k].value = (v === null || v === undefined || v === '')
            ? ''
            : Number(v).toFixed(2);
        } else {
          form.elements[k].value = v ?? '';
        }
      }
    });
    const title = backdrop.querySelector('.modal-title');
    if (title) title.textContent = i18n.t('Editar gasto');
  } else {
    form.reset();
  }

  populateSupplierOptions();
  updateSupplierPreview();

  ensureProvidersLoaded().then(() => {
    populateSupplierOptions();
    updateSupplierPreview();
  });

  if (supplierInput) {
    supplierInput.addEventListener('input', updateSupplierPreview);
    supplierInput.addEventListener('change', updateSupplierPreview);
  }

  if (invoiceDateInput) {
    invoiceDateInput.addEventListener('change', autoFillQuarterIfEmpty);
    invoiceDateInput.addEventListener('blur', autoFillQuarterIfEmpty);
  }

  autoFillQuarterIfEmpty();
  updateSupplierPreview();

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
    const raw = Object.fromEntries(formData.entries());

    let quarterValue = raw.quarter;
    if (!quarterValue) {
      const computed = computeQuarterFromDate(raw.invoiceDate);
      if (computed) {
        quarterValue = String(computed);
        if (quarterSelect) quarterSelect.value = quarterValue;
      }
    }

    const quarterNumber = parseInt(quarterValue, 10);

    const payload = {
      supplierCode: (raw.supplierCode || '').trim(),
      invoiceNumber: (raw.invoiceNumber || '').trim(),
      invoiceDate: raw.invoiceDate,
      taxableBase: raw.taxableBase === '' ? null : parseFloat(raw.taxableBase),
      vatRate: raw.vatRate === '' ? null : parseFloat(raw.vatRate),
      quarter: !quarterValue || !Number.isFinite(quarterNumber) ? null : quarterNumber
    };

    if (!payload.invoiceNumber) {
      alert(i18n.t('El número de factura es obligatorio'));
      return;
    }
    if (!payload.invoiceDate) {
      alert(i18n.t('La fecha es obligatoria'));
      return;
    }
    if (!Number.isFinite(payload.taxableBase)) {
      alert(i18n.t('La base imponible debe ser un número válido'));
      return;
    }
    if (payload.vatRate !== null && !Number.isFinite(payload.vatRate)) {
      alert(i18n.t('El IVA debe ser un número válido'));
      return;
    }

    try {
      if (expense && expense.entryNo != null) {
        await db.update('expenses', { entry_no: expense.entryNo }, payload);
        await loadExpenses();
        const updated = expenses.find(e => e.entryNo === expense.entryNo);
        closeModal();
        if (onSave) onSave(updated ? updated.entryNo : expense.entryNo);
      } else {
        const inserted = await db.insert('expenses', payload);
        await loadExpenses();
        closeModal();
        if (onSave) onSave(inserted.entryNo);
      }
    } catch (err) {
      console.error(err);
      alert(i18n.t('Error al guardar el gasto'));
    }
  });

  (currentExpensesBackdrop || document.body).appendChild(clone);
}

window.openExpensesPopup = openExpensesPopup;
