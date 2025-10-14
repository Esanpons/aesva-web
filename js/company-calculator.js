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
      modal.className = 'modal narrow';
      modal.appendChild(page);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      currentCompanyCalcBackdrop = backdrop;

      const form = backdrop.querySelector('#calcForm');
      const f = form.elements;

      // populate company defaults
      f.minimumHours.value = company.minimumHoursMonth || 0;
      f.amountAutonomos.value = company.amountAutonomos || 0;
      f.amountNomina.value = company.amountNomina || 0;
      f.incomeAmount.value = company.incomeAmount || 0;
      if (f.irpfExtraAmount) f.irpfExtraAmount.value = '0.00';
      f.extraAmounts.value = company.extraAmounts || 0;

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
        recalc();
      }

      f.customerNo.addEventListener('change', e => loadCustomer(e.target.value));

      const fieldsToWatch = [
        'minimumHours', 'priceHour', 'vat', 'irpf', 'amountAutonomos',
        'amountNomina', 'incomeAmount', 'extraAmounts'
      ];
      fieldsToWatch.forEach(n => f[n].addEventListener('input', recalc));

      function recalc() {
        const minHours = parseFloat(f.minimumHours.value) || 0;
        const price = parseFloat(f.priceHour.value) || 0;
        const vat = parseFloat(f.vat.value) || 0;
        const irpf = parseFloat(f.irpf.value) || 0;
        const autonomos = parseFloat(f.amountAutonomos.value) || 0;
        const nomina = parseFloat(f.amountNomina.value) || 0;
        const extraIrpfPercent = parseFloat(f.incomeAmount.value) || 0;
        const extras = parseFloat(f.extraAmounts.value) || 0;
        const pending = minHours * price;
        const vatAmount = pending * vat / 100;
        const irpfAmount = pending * irpf / 100;
        const extraIrpfAmount = pending * extraIrpfPercent / 100;
        const netBeforeTithe = pending - irpfAmount - extraIrpfAmount - autonomos;
        const delmeBase = Math.max(netBeforeTithe, 0);
        const delme = Math.ceil(delmeBase * (company.tithePercent || 0) / 100);
        const result = pending - (irpfAmount + extraIrpfAmount + autonomos + delme + nomina + extras);
        f.pending.value = pending.toFixed(2);
        f.vatAmount.value = vatAmount.toFixed(2);
        f.irpfAmount.value = irpfAmount.toFixed(2);
        if (f.irpfExtraAmount) f.irpfExtraAmount.value = extraIrpfAmount.toFixed(2);
        f.tithe.value = delme.toFixed(2);
        f.result.value = result.toFixed(2);
      }

      if (customers.length) loadCustomer(f.customerNo.value);
      else recalc();

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
