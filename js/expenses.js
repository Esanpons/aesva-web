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

const computeYearFromDate = dateStr => {
  if (!dateStr) return null;
  const match = /^([0-9]{4})/.exec(String(dateStr));
  if (!match) return null;
  const year = parseInt(match[1], 10);
  return Number.isFinite(year) ? year : null;
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
      const btnExport = backdrop.querySelector('#BtnExportExpenses');
      const closeBtn = backdrop.querySelector('.close');
      const filterYear = backdrop.querySelector('#expenseFilterYear');
      const filterQuarter = backdrop.querySelector('#expenseFilterQuarter');

      const translate = key => (window.i18n ? i18n.t(key) : key);

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
      const csvNumberFormatter = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

      function sanitizeCsvField(value) {
        if (value == null) return '';
        return String(value).replace(/[\r\n]+/g, ' ').replace(/;/g, ',');
      }

      function formatNumberCsv(value) {
        const num = Number.parseFloat(value);
        if (!Number.isFinite(num)) return '';
        return csvNumberFormatter.format(num);
      }

      function formatPercentCsv(value) {
        const num = Number.parseFloat(value);
        if (!Number.isFinite(num)) return '';
        return csvNumberFormatter.format(num);
      }

      function formatDateForCsv(dateStr) {
        if (!dateStr) return '';
        const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateStr);
        if (!match) return '';
        return `${match[3]}/${match[2]}/${match[1]}`;
      }

      function getQuarterValue(expense) {
        if (!expense) return null;
        const rawQuarter = expense.quarter;
        if (rawQuarter !== undefined && rawQuarter !== null && rawQuarter !== '') {
          const parsed = Number.parseInt(rawQuarter, 10);
          if (Number.isFinite(parsed)) return parsed;
        }
        const computed = computeQuarterFromDate(expense.invoiceDate);
        return Number.isFinite(computed) ? computed : null;
      }

      function formatAmount(value) {
        const num = Number.parseFloat(value);
        return Number.isFinite(num) ? amountFormatter.format(num) : '0,00';
      }

      function populateYearOptions() {
        if (!filterYear) return;
        const previousValue = filterYear.value;
        const years = Array.from(new Set(expenses
          .map(expense => computeYearFromDate(expense.invoiceDate))
          .filter(year => Number.isFinite(year))))
          .sort((a, b) => b - a)
          .map(year => String(year));

        filterYear.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = translate('Todos');
        filterYear.appendChild(allOption);

        years.forEach(year => {
          const option = document.createElement('option');
          option.value = year;
          option.textContent = year;
          filterYear.appendChild(option);
        });

        if (previousValue && years.includes(previousValue)) {
          filterYear.value = previousValue;
        } else {
          filterYear.value = '';
        }
      }

      function getFilteredExpenses() {
        const yearFilter = filterYear ? filterYear.value : '';
        const quarterFilter = filterQuarter ? filterQuarter.value : '';

        return expenses.filter(expense => {
          if (yearFilter) {
            const invoiceYear = computeYearFromDate(expense.invoiceDate);
            if (String(invoiceYear) !== yearFilter) return false;
          }
          if (quarterFilter) {
            const quarterValue = expense.quarter == null ? '' : String(expense.quarter);
            if (quarterValue !== quarterFilter) return false;
          }
          return true;
        });
      }

      function sortExpensesForExport(list) {
        return [...list].sort((a, b) => {
          const yearA = computeYearFromDate(a.invoiceDate) ?? 0;
          const yearB = computeYearFromDate(b.invoiceDate) ?? 0;
          if (yearA !== yearB) return yearA - yearB;
          const quarterA = getQuarterValue(a) ?? 0;
          const quarterB = getQuarterValue(b) ?? 0;
          if (quarterA !== quarterB) return quarterA - quarterB;
          const dateA = a.invoiceDate || '';
          const dateB = b.invoiceDate || '';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          const invoiceA = (a.invoiceNumber || '').toString();
          const invoiceB = (b.invoiceNumber || '').toString();
          return invoiceA.localeCompare(invoiceB);
        });
      }

      function buildExpensesCsvContent(list) {
        const header = [
          'COD PROVEIDOR',
          'NUM. FRA.',
          'DATA',
          'Base Imposable',
          '% IVA',
          'Trimestre',
          'Empty00',
          'Num',
          'Extraccio: NUM. FRA.2',
          'Extraccio: DATA',
          'Extraccio: NIF',
          'Extraccio: PROVEIDOR',
          'Extraccio: COMPTE',
          'Extraccio: Base Imposable',
          'Extraccio: %',
          'Empty01',
          'Empty02',
          'Empty03',
          'Empty04',
          'Empty05',
          'Extraccio: ES FACTURA?  SI/NO',
          'Extraccio: ACTIVITAT EXEMPTA IVA?',
          'Extraccio: PAIS',
          'Extraccio: DESCRIPCIO INVERSIO'
        ];

        const rows = [header.join(';')];
        const quarterCounters = new Map();

        list.forEach(expense => {
          const provider = findProviderByCode(expense.supplierCode);
          const invoiceDateFormatted = formatDateForCsv(expense.invoiceDate);
          const taxBaseDisplay = formatNumberCsv(expense.taxableBase);
          const vatRateValue = Number.parseFloat(expense.vatRate);
          const vatPercentDisplay = formatNumberCsv(vatRateValue);
          const vatFractionDisplay = Number.isFinite(vatRateValue) ? formatPercentCsv(vatRateValue / 100) : '';
          const quarterValue = getQuarterValue(expense);
          const quarterText = quarterValue != null ? String(quarterValue) : '';
          const yearValue = computeYearFromDate(expense.invoiceDate);
          const counterKey = `${yearValue ?? 'noYear'}-${quarterValue ?? 'noQuarter'}`;
          const nextSeq = (quarterCounters.get(counterKey) || 0) + 1;
          quarterCounters.set(counterKey, nextSeq);

          const row = [
            sanitizeCsvField(expense.supplierCode || ''),
            sanitizeCsvField(expense.invoiceNumber || ''),
            invoiceDateFormatted,
            sanitizeCsvField(taxBaseDisplay),
            sanitizeCsvField(vatPercentDisplay),
            sanitizeCsvField(quarterText),
            '',
            String(nextSeq),
            sanitizeCsvField(expense.invoiceNumber || ''),
            invoiceDateFormatted,
            sanitizeCsvField(provider && provider.taxId ? provider.taxId : ''),
            sanitizeCsvField(provider && provider.name ? provider.name : ''),
            sanitizeCsvField(provider && provider.managerAccountCode ? provider.managerAccountCode : ''),
            sanitizeCsvField(taxBaseDisplay),
            sanitizeCsvField(vatFractionDisplay),
            '',
            '',
            '',
            '',
            '',
            'SI',
            '',
            sanitizeCsvField(provider && provider.country ? provider.country : ''),
            sanitizeCsvField(provider && provider.name ? provider.name : '')
          ];

          rows.push(row.join(';'));
        });

        return rows.join('\r\n');
      }

      function downloadCsv(content) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const fileName = `gastos-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      function renderExpenses() {
        populateYearOptions();

        const filtered = getFilteredExpenses();

        if (selectedEntryNo != null && !filtered.some(expense => expense.entryNo === selectedEntryNo)) {
          selectedEntryNo = null;
        }

        const sorted = [...filtered].sort((a, b) => {
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

      const handleFilterChange = () => {
        selectedEntryNo = null;
        renderExpenses();
      };

      if (filterYear) filterYear.addEventListener('change', handleFilterChange);
      if (filterQuarter) filterQuarter.addEventListener('change', handleFilterChange);

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

      if (btnExport) {
        btnExport.addEventListener('click', () => {
          ensureProvidersLoaded().then(() => {
            const filtered = getFilteredExpenses();
            if (!filtered.length) {
              alert(translate('No hay datos para exportar'));
              return;
            }
            const sortedForExport = sortExpensesForExport(filtered);
            const csvContent = buildExpensesCsvContent(sortedForExport);
            if (!csvContent) {
              alert(translate('No hay datos para exportar'));
              return;
            }
            downloadCsv(csvContent);
          });
        });
      }

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
