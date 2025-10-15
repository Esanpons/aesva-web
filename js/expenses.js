/*************** Gastos (popup externo) ****************/
let currentExpensesBackdrop = null;

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
          tr.innerHTML = `
            <td>${expense.supplierCode || ''}</td>
            <td>${expense.invoiceNumber || ''}</td>
            <td>${invoiceDate}</td>
            <td class="numeric">${taxBaseDisplay}</td>
            <td class="numeric">${vatDisplay}</td>
            <td>${expense.quarter != null ? expense.quarter : ''}</td>`;
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
    });
}

function openExpenseModal(expense = null, onSave) {
  const tmpl = (currentExpensesBackdrop || document).querySelector('#expenseModalTmpl');
  if (!tmpl) return;
  const clone = tmpl.content.cloneNode(true);
  const backdrop = clone.querySelector('.modal-backdrop');
  const form = clone.querySelector('#expenseForm');

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

    const payload = {
      supplierCode: (raw.supplierCode || '').trim(),
      invoiceNumber: (raw.invoiceNumber || '').trim(),
      invoiceDate: raw.invoiceDate,
      taxableBase: raw.taxableBase === '' ? null : parseFloat(raw.taxableBase),
      vatRate: raw.vatRate === '' ? null : parseFloat(raw.vatRate),
      quarter: raw.quarter === '' ? null : parseInt(raw.quarter, 10)
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
