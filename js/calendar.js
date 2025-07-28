// Popup Calendario
document
  .getElementById("btnCalendar")
  .addEventListener("click", openCalendarPopup);
let calBackdrop = null;

function openCalendarPopup() {
  if (calBackdrop) {
    calBackdrop.remove();
    calBackdrop = null;
  }
  fetch("html/calendar.html")
    .then((r) => r.text())
    .then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const page = doc.getElementById("calendarPage");
      calBackdrop = document.createElement("div");
      calBackdrop.className = "modal-backdrop";
      const modal = document.createElement("div");
      modal.className = "modal";
      modal.appendChild(page);
      calBackdrop.appendChild(modal);
      document.body.appendChild(calBackdrop);

      const tblBody = calBackdrop.querySelector("#calendarTable tbody");
      const btnAdd = calBackdrop.querySelector("#BtnAddCal");
      const btnEdit = calBackdrop.querySelector("#BtnEditCal");
      const btnDel = calBackdrop.querySelector("#BtnDelCal");
      const btnYear = calBackdrop.querySelector("#BtnYearView");
      const weekDiv = calBackdrop.querySelector("#weekCfg");
      const yearSel = calBackdrop.querySelector("#calYearFilter");
      const typeSel = calBackdrop.querySelector("#calTypeFilter");
      const summaryDiv = calBackdrop.querySelector("#calendarSummary");
      const close = calBackdrop.querySelector(".close");

      function closePopup() {
        calBackdrop.remove();
        calBackdrop = null;
        document.removeEventListener("keydown", handleEsc);
      }

      function handleEsc(e) {
        if (e.key === "Escape") closePopup();
      }
      document.addEventListener("keydown", handleEsc);

      let selectedDate = calendarDays.length ? calendarDays[0].date : null;

      function renderWeekCfg() {
        weekDiv.innerHTML = "";
        const order = [1, 2, 3, 4, 5, 6, 0];
        const days = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
        order.forEach((idx) => {
          const d = days[idx];
          const lbl = document.createElement("label");
          lbl.innerHTML = `<input type="checkbox" ${
            weekConfig[idx] ? "checked" : ""
          }> ${d}`;
          lbl.querySelector("input").addEventListener("change", (e) => {
            weekConfig[idx] = e.target.checked;
            recalcCalendarFlags();
            (async () => {
              await db.delete("week_config", { weekday: idx });
              await db.insert("week_config", {
                weekday: idx,
                working: weekConfig[idx],
              });
              loadFromDb();
            })().catch(console.error);
          });
          weekDiv.appendChild(lbl);
        });
      }

      function renderYearOptions() {
        const years = Array.from(
          new Set(calendarDays.map((d) => d.date.substring(0, 4)))
        );
        const current = new Date().getFullYear().toString();
        if (!years.includes(current)) years.push(current);
        years.sort((a, b) => b - a);
        yearSel.innerHTML = years
          .map((y) => `<option value="${y}">${y}</option>`)
          .join("");
        yearSel.value = current;
      }

      function renderDays() {
        tblBody.innerHTML = "";
        const year = yearSel.value;
        const type = typeSel.value;
        const list = calendarDays
          .filter((d) => d.date.startsWith(year))
          .filter((d) => type === "all" || d.type === type)
          .sort((a, b) => a.date.localeCompare(b.date))
        if(selectedDate===null && list.length) selectedDate=list[0].date;
        list.forEach((rec) => {
            const tr = document.createElement("tr");
            tr.dataset.date = rec.date;
            tr.innerHTML = `<td>${rec.date}</td><td>${rec.type}</td><td>${
              rec.desc || ""
            }</td>`;
            if (rec.date === selectedDate) tr.classList.add("selected");
            tr.addEventListener("click", () => {
              selectedDate = rec.date;
              renderDays();
            });
            tr.addEventListener("dblclick", () => {
              openCalModal(rec);
            });
            tblBody.appendChild(tr);
          });
        btnEdit.disabled = !selectedDate;
        btnDel.disabled = !selectedDate;
        updateSummary();
      }

      function updateSummary(){
        if(!summaryDiv) return;
        const year = yearSel.value;
        const vac = calendarDays.filter(d=>d.type==='vacaciones' && d.date.startsWith(year)).length;
        const fest = calendarDays.filter(d=>d.type==='festivo' && d.date.startsWith(year)).length;
        const nolab = calendarDays.filter(d=>d.type==='no_laboral' && d.date.startsWith(year)).length;
        let working=0;
        for(let d=new Date(year,0,1); d.getFullYear()==year; d.setDate(d.getDate()+1)){
          if(weekConfig[d.getDay()]) working++;
        }
        const labor = working - vac - fest - nolab;
        const remain = (company.totalVacationDays||0) - vac;
        summaryDiv.innerHTML=`
          <div><span>Vacaciones</span><strong>${vac}</strong></div>
          <div><span>Festivos</span><strong>${fest}</strong></div>
          <div><span>No laborales</span><strong>${nolab}</strong></div>
          <div><span>Laborables</span><strong>${labor}</strong></div>
          <div><span>Vacaciones restantes</span><strong>${remain}</strong></div>`;
      }

      function openCalModal(rec = null) {
        const tmpl = calBackdrop
          .querySelector("#calModalTmpl")
          .content.cloneNode(true);
        const bd = tmpl.querySelector(".modal-backdrop");
        const form = tmpl.querySelector("#calForm");
        if (rec) {
          form.elements.date.value = rec.date;
          form.elements.type.value = rec.type;
          form.elements.desc.value = rec.desc || "";
          tmpl.querySelector(".modal-title").textContent = "Editar día";
        }
        function closeModal() {
          bd.remove();
          document.removeEventListener("keydown", handleEscModal, true);
        }
        function handleEscModal(e) {
          if (e.key === "Escape") {
            e.stopPropagation();
            closeModal();
          }
        }
        document.addEventListener("keydown", handleEscModal, true);
        bd.querySelector(".close").addEventListener("click", closeModal);
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const data = sanitizeStrings(
            Object.fromEntries(new FormData(form).entries())
          );
          try {
            if (rec) {
              await db.update(
                "calendar_days",
                { date: rec.date },
                { date: data.date, type: data.type, description: data.desc }
              );
            } else {
              await db.insert("calendar_days", {
                date: data.date,
                type: data.type,
                description: data.desc,
              });
            }
            await loadFromDb();
            bd.remove();
            selectedDate = data.date;
            renderDays();
            recalcCalendarFlags();
            updateSummary();
          } catch (err) {
            console.error(err);
            alert("Error al guardar el día");
          }
        });
        (calBackdrop || document.body).appendChild(bd);
      }

      btnAdd.addEventListener("click", () => openCalModal());
      btnEdit.addEventListener("click", () =>
        openCalModal(calendarDays.find((d) => d.date === selectedDate))
      );
      btnDel.addEventListener("click", async () => {
        if (!selectedDate) return;
        if (confirm("¿Eliminar día?")) {
          try {
            await db.delete("calendar_days", { date: selectedDate });
            await loadFromDb();
            selectedDate = null;
            renderDays();
            recalcCalendarFlags();
            updateSummary();
          } catch (err) {
            console.error(err);
            alert("Error al eliminar el día");
          }
        }
      });
      yearSel.addEventListener("change", () => { renderDays(); });
      yearSel.addEventListener("change", updateSummary);
      typeSel.addEventListener("change", () => { renderDays(); });
      typeSel.addEventListener("change", updateSummary);
      if(btnYear) btnYear.addEventListener("click", openYearView);
      close.addEventListener("click", closePopup);

  renderWeekCfg();
  renderYearOptions();
  renderDays();
  updateSummary();
});
}

function openYearView(){
  const year = document.querySelector('#calYearFilter').value;
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '95vw';
  const header = document.createElement('header');
  header.innerHTML = `<span class="modal-title">Año ${year}</span><button class="close" type="button">×</button>`;
  modal.appendChild(header);
  const cont = document.createElement('div');
  cont.className = 'year-calendar';
  for(let m=0;m<12;m++){
    const table=document.createElement('table');
    const monthName=new Date(year,m,1).toLocaleString('es',{month:'long'});
    table.innerHTML=`<thead><tr><th colspan="7">${monthName}</th></tr><tr><th>L</th><th>M</th><th>X</th><th>J</th><th>V</th><th>S</th><th>D</th></tr></thead>`;
    const tbody=document.createElement('tbody');
    const first=new Date(year,m,1);
    let startDay=(first.getDay()+6)%7;
    let days=new Date(year,m+1,0).getDate();
    let tr=document.createElement('tr');
    for(let i=0;i<startDay;i++) tr.appendChild(document.createElement('td'));
    for(let d=1; d<=days; d++){
      if((startDay+d-1)%7===0 && d>1){tbody.appendChild(tr);tr=document.createElement('tr');}
      const td=document.createElement('td');
      td.textContent=d;
      const dateStr=`${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if(calendarDays.find(c=>c.date===dateStr && c.type==='festivo')) td.classList.add('holiday');
      else if(calendarDays.find(c=>c.date===dateStr && c.type==='vacaciones')) td.classList.add('vacation');
      else if(calendarDays.find(c=>c.date===dateStr && c.type==='no_laboral')) td.classList.add('nolaboral');
      tr.appendChild(td);
    }
    while(tr.children.length<7) tr.appendChild(document.createElement('td'));
    tbody.appendChild(tr);
    table.appendChild(tbody);
    cont.appendChild(table);
  }
  modal.appendChild(cont);
  const legend = document.createElement('div');
  legend.className = 'calendar-legend';
  legend.innerHTML = `
    <span class="label"><span class="box holiday"></span>Festivos</span>
    <span class="label"><span class="box vacation"></span>Vacaciones</span>
    <span class="label"><span class="box nolaboral"></span>No laboral</span>
  `;
  modal.appendChild(legend);
  bd.appendChild(modal);
  function close(){bd.remove();}
  header.querySelector('.close').addEventListener('click',close);
  bd.addEventListener('click',e=>{if(e.target===bd) close();});
  document.body.appendChild(bd);
}
