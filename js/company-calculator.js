/*************** Cálculo horas de empresa ****************/
let currentCompanyCalcBackdrop = null;

function openCompanyCalcPopup() {
  if (currentCompanyCalcBackdrop) {
    currentCompanyCalcBackdrop.remove();
    currentCompanyCalcBackdrop = null;
  }

  fetch("html/company-calculator.html")
    .then(r => r.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const page = doc.getElementById('companyCalcPage');
      if (window.i18n) i18n.apply(page);
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      const modal = document.createElement('div');
      modal.className = 'modal company-calc-modal';
      modal.appendChild(page);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      currentCompanyCalcBackdrop = backdrop;

      const form = backdrop.querySelector('#calcForm');
      const f = form.elements;
      const summary = backdrop.querySelector('.company-calc-summary');
      const clientDisplay = backdrop.querySelector('#companyCalcClient');
      const summaryFields = {};

      summary?.querySelectorAll('[data-field]').forEach(node => {
        const field = node.dataset.field;
        if (!summaryFields[field]) summaryFields[field] = [];
        summaryFields[field].push(node);
      });

      // populate company defaults
      f.minimumHours.value = company.minimumHoursMonth || 0;
      f.amountAutonomos.value = company.amountAutonomos || 0;
      f.amountNomina.value = company.amountNomina || 0;
      f.incomeAmount.value = company.incomeAmount || 0;
      if (f.irpfExtraAmount) f.irpfExtraAmount.value = '0.00';
      f.extraAmounts.value = company.extraAmounts || 0;
      if (f.manualExtra) f.manualExtra.value = 0;

      // populate customers select
      customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.no;
        opt.textContent = `${c.no} - ${c.name}`;
        f.customerNo.appendChild(opt);
      });
      if (customers.length) f.customerNo.value = customers[0].no;

      function loadCustomer(no) {
        const c = customers.find(x => x.no == no) || {};
        f.priceHour.value = c.priceHour || 0;
        f.vat.value = c.vat || 0;
        f.irpf.value = c.irpf || 0;
        updateClientLabel();
        recalc();
      }

      f.customerNo.addEventListener('change', e => loadCustomer(e.target.value));

      const fieldsToWatch = [
        'minimumHours', 'priceHour', 'vat', 'irpf', 'amountAutonomos',
        'amountNomina', 'incomeAmount', 'extraAmounts', 'manualExtra'
      ];
      fieldsToWatch.forEach(n => f[n].addEventListener('input', recalc));

      const amountFormatter = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const percentFormatter = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      function formatAmount(value) {
        const numeric = Number.isFinite(value) ? value : 0;
        return amountFormatter.format(numeric);
      }

      function setAmount(field, value, tone = 'neutral') {
        const nodes = summaryFields[field] || [];
        const numeric = Number.isFinite(value) ? value : 0;
        const classes = ['extras-amount-negative', 'extras-amount-positive', 'extras-amount-neutral'];
        nodes.forEach(node => {
          node.textContent = formatAmount(numeric);
          node.classList.remove(...classes);
          if (tone === 'negative') node.classList.add('extras-amount-negative');
          else if (tone === 'positive') node.classList.add('extras-amount-positive');
          else if (tone === 'auto') {
            if (numeric < 0) node.classList.add('extras-amount-negative');
            else if (numeric > 0) node.classList.add('extras-amount-positive');
            else node.classList.add('extras-amount-neutral');
          } else {
            node.classList.add('extras-amount-neutral');
          }
        });
      }

      function setPercent(field, value) {
        const nodes = summaryFields[field] || [];
        const numeric = Number.isFinite(value) ? value : 0;
        nodes.forEach(node => {
          node.textContent = `${percentFormatter.format(numeric)}%`;
          node.classList.remove('extras-amount-negative', 'extras-amount-positive');
          node.classList.add('extras-amount-neutral');
        });
      }

      function updateClientLabel() {
        if (!clientDisplay) return;
        const option = f.customerNo.options[f.customerNo.selectedIndex];
        clientDisplay.textContent = option ? option.textContent : '—';
      }

      function recalc() {
        const minHours = parseFloat(f.minimumHours.value) || 0;
        const price = parseFloat(f.priceHour.value) || 0;
        const vat = parseFloat(f.vat.value) || 0;
        const irpf = parseFloat(f.irpf.value) || 0;
        const autonomos = parseFloat(f.amountAutonomos.value) || 0;
        const nomina = parseFloat(f.amountNomina.value) || 0;
        const extraIrpfPercent = parseFloat(f.incomeAmount.value) || 0;
        const extras = parseFloat(f.extraAmounts.value) || 0;
        const manualExtra = parseFloat(f.manualExtra.value) || 0;
        const pending = minHours * price;
        const vatAmount = pending * vat / 100;
        const irpfAmount = pending * irpf / 100;
        const extraIrpfAmount = pending * extraIrpfPercent / 100;
        const netBeforeTithe = pending - irpfAmount - extraIrpfAmount - autonomos;
        const delmeBase = Math.max(netBeforeTithe, 0);
        const delme = Math.ceil(delmeBase * (company.tithePercent || 0) / 100);
        const result = pending - (irpfAmount + extraIrpfAmount + autonomos + delme + nomina + extras) + manualExtra;
        if (f.pending) f.pending.value = pending.toFixed(2);
        if (f.vatAmount) f.vatAmount.value = vatAmount.toFixed(2);
        if (f.irpfAmount) f.irpfAmount.value = irpfAmount.toFixed(2);
        if (f.irpfExtraAmount) f.irpfExtraAmount.value = extraIrpfAmount.toFixed(2);
        if (f.tithe) f.tithe.value = delme.toFixed(2);
        if (f.result) f.result.value = result.toFixed(2);

        setAmount('hours', minHours, 'neutral');
        setAmount('price', price, 'neutral');
        setAmount('pending', pending, 'neutral');
        setAmount('vatAmount', vatAmount, 'positive');
        setAmount('irpfRetention', irpfAmount, 'negative');
        setAmount('irpfExtraRetention', extraIrpfAmount, 'negative');
        setAmount('autonomos', autonomos, 'negative');
        setAmount('nomina', nomina, 'negative');
        setAmount('extras', extras, 'negative');
        setAmount('manualExtra', manualExtra, manualExtra >= 0 ? 'positive' : 'negative');
        setAmount('tithe', delme, 'negative');
        setAmount('result', result, 'auto');
      }

      if (customers.length) loadCustomer(f.customerNo.value);
      else {
        updateClientLabel();
        recalc();
      }

      const closeBtn = backdrop.querySelector('.close');
      function close() {
        backdrop.remove();
        currentCompanyCalcBackdrop = null;
        document.removeEventListener('keydown', handleEsc);
      }
      function handleEsc(e) { if (e.key === 'Escape') close(); }
      document.addEventListener('keydown', handleEsc);
      closeBtn.addEventListener('click', close);
    });
}

function calculateClientHoursResult(clientNo, hours) {
  const client = customers.find(c => c.no == clientNo);
  if (!client) return null;
  const price = client.priceHour || 0;
  const vat = client.vat || 0;
  const irpf = client.irpf || 0;
  const pending = hours * price;
  const vatAmount = pending * vat / 100;
  const irpfAmount = pending * irpf / 100;
  const autonomos = company.amountAutonomos || 0;
  const nomina = company.amountNomina || 0;
  const extraIrpfPercent = company.incomeAmount || 0;
  const extraIrpfAmount = pending * extraIrpfPercent / 100;
  const netBeforeTithe = pending - irpfAmount - extraIrpfAmount - autonomos;
  const delmeBase = Math.max(netBeforeTithe, 0);
  const delme = Math.ceil(delmeBase * (company.tithePercent || 0) / 100);
  const extras = company.extraAmounts || 0;
  const result = pending - (irpfAmount + extraIrpfAmount + autonomos + delme + nomina + extras);
  return {
    pending, vatAmount, irpfAmount, extraIrpfAmount, delme, result
  };
}

window.openCompanyCalcPopup = openCompanyCalcPopup;
window.calculateClientHoursResult = calculateClientHoursResult;
