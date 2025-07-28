/*************** Tareas (popup externo) ****************/
let currentTasksBackdrop = null;

document.getElementById("btnTasks").addEventListener("click", openTasksPopup);

function openTasksPopup() {
  if (currentTasksBackdrop) { currentTasksBackdrop.remove(); currentTasksBackdrop = null; }

  fetch("html/tasks.html")
    .then(r => r.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const tasksPage = doc.getElementById('tasksPage');
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop tasks-popup';
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.appendChild(tasksPage);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      currentTasksBackdrop = backdrop;

      const tasksTableBody = backdrop.querySelector("#tasksTable tbody");
      const btnAdd = backdrop.querySelector("#BtnAddTask");
      const btnEdit = backdrop.querySelector("#BtnEditTask");
      const btnDup = backdrop.querySelector("#BtnDupTask");
      const btnDel = backdrop.querySelector("#BtnDelTask");
      const statusFilter = backdrop.querySelector("#taskStatusFilter");
      const searchInput = backdrop.querySelector("#taskSearchFilter");
      const closeBtn = backdrop.querySelector(".close");

      function closePopup() {
        backdrop.remove();
        currentTasksBackdrop = null;
        window.refreshTasksPopup = null;
        document.removeEventListener('keydown', handleEsc);
      }

      function handleEsc(e) { if (e.key === 'Escape') closePopup(); }
      document.addEventListener('keydown', handleEsc);

      let selectedTaskId = tasks.length ? tasks.slice().sort((a, b) => b.id - a.id)[0].id : null;

      function updateButtons() {
        const hasSel = !!selectedTaskId;
        btnEdit.disabled = !hasSel;
        btnDup.disabled = !hasSel;
        btnDel.disabled = !hasSel;
      }


      function renderTasks() {
        tasksTableBody.innerHTML = "";
        let list = tasks.slice().sort((a, b) => b.id - a.id);
        if (selectedTaskId === null && list.length) selectedTaskId = list[0].id;
        const st = statusFilter.value;
        if (st === 'completed') list = list.filter(t => t.completed);
        else if (st === 'incomplete') list = list.filter(t => !t.completed);
        const txt = searchInput.value.toLowerCase();
        if (txt) {
          list = list.filter(t => {
            return Object.values(t).some(v => v && String(v).toLowerCase().includes(txt));
          });
        }
        list.forEach(t => {
          const tr = document.createElement('tr');
          tr.dataset.id = t.id;
          const shortSub = t.subject.length > 20 ? t.subject.slice(0, 20) + '…' : t.subject;
          tr.innerHTML = `<td>${t.id}</td><td>${t.clientTaskNo || ''}</td><td>${shortSub}</td>` +
            `<td>${t.customerNo || ''}</td>` +
            `<td>${t.noCharge ? 'Sí' : 'No'}</td>` +
            `<td>${t.completed ? 'Sí' : 'No'}</td>`;
          if (t.id === selectedTaskId) tr.classList.add('selected');
          tr.addEventListener('click', () => { selectedTaskId = t.id; renderTasks(); });
          tr.addEventListener('dblclick', () => { openTaskModal(t, id => { selectedTaskId = id; renderTasks(); }); });
          tasksTableBody.appendChild(tr);
        });
        updateButtons();
        loadTasksInSelects();
      }

      statusFilter.addEventListener('change', renderTasks);
      searchInput.addEventListener('input', renderTasks);
      btnAdd.addEventListener("click", () => openTaskModal(null, id => { selectedTaskId = id; renderTasks(); }));
      btnEdit.addEventListener("click", () => {
        const task = tasks.find(t => t.id === selectedTaskId);
        if (task) openTaskModal(task, id => { selectedTaskId = id; renderTasks(); });
      });
      btnDup.addEventListener("click", async () => {
        if (!selectedTaskId) return;
        const copy = await duplicateTask(selectedTaskId);
        if (copy) openTaskModal(copy, id => { selectedTaskId = id; renderTasks(); });
      });
      btnDel.addEventListener("click", () => {
        if (!selectedTaskId) return;
        if (confirm("¿Eliminar tarea?")) {
          (async () => {
            try {
              await db.delete('tasks', { id: selectedTaskId });
              await loadFromDb();
              selectedTaskId = null;
              renderTasks();
              loadTasksInSelects();
              renderImputations();
            } catch (err) {
              console.error(err);
              alert('Error al eliminar la tarea');
            }
          })();
        }
      });

      closeBtn.addEventListener("click", closePopup);
      renderTasks();

      window.refreshTasksPopup = renderTasks;
    });
}

function duplicateTask(id) {
  const original = tasks.find(t => t.id === id);
  if (!original) return null;
  const copy = sanitizeStrings({ ...original, id: taskSeq++ });
  return db.insert('tasks', copy)
    .then(rec => { loadFromDb(); return rec; })
    .catch(err => { console.error(err); alert('Error al duplicar'); return null; });
}

function openTaskModal(task = null, onSave) {
  const tmpl = (currentTasksBackdrop || document).querySelector("#taskModalTmpl");
  const clone = tmpl.content.cloneNode(true);
  const backdrop = clone.querySelector(".modal-backdrop");
  const form = clone.querySelector("#taskForm");
  const customerSel = form.elements["customerNo"];
  customerSel.innerHTML = '<option value=""></option>' + customers.map(c => `<option value="${c.no}">${c.no} - ${c.name}</option>`).join('');
  if (task) {
    Object.entries(task).forEach(([k, v]) => { if (form.elements[k] != null) form.elements[k].value = v; });
    form.elements["noCharge"].checked = !!task.noCharge;
    form.elements["completed"].checked = !!task.completed;
    backdrop.querySelector(".modal-title").textContent = "Editar tarea";
  } else {
    form.elements["id"].value = taskSeq;
  }
  function closeModal() {
    backdrop.remove();
    document.removeEventListener('keydown', handleEsc, true);
  }
  function handleEsc(e) { if (e.key === 'Escape') { e.stopPropagation(); closeModal(); } }
  document.addEventListener('keydown', handleEsc, true);
  backdrop.querySelector(".close").addEventListener("click", closeModal);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const data = sanitizeStrings(Object.fromEntries(new FormData(form).entries()));
    data.noCharge = form.elements["noCharge"].checked;
    data.completed = form.elements["completed"].checked;
    data.id = Number(form.elements["id"].value);
    await applyAiCorrection('tasks', data, task || {});
    let savedId;
    try {
      if (task) {
        await db.update('tasks', { id: task.id }, data);
        savedId = task.id;
      } else {
        await db.insert('tasks', data);
        savedId = data.id;
      }
      await loadFromDb();
      backdrop.remove();
      if (onSave) onSave(savedId);
      loadTasksInSelects();
      renderImputations();
      if (window.refreshTasksPopup) window.refreshTasksPopup();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la tarea');
    }
  });
  (currentTasksBackdrop || document.body).appendChild(clone);
}
