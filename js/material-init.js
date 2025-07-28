// Inicializa interacción con Drawer y filtros
const drawer = document.getElementById('navDrawer');
const menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', () => {
  drawer.open = true;
});

// Cerrar drawer al seleccionar destino
Array.from(drawer.querySelectorAll('md-list-item')).forEach(item => {
  item.addEventListener('click', () => { drawer.open = false; });
});

// Mapea filtros de vista a la lógica existente
const filterButtons = document.getElementById('viewFilters');
const filterMap = ['all','today','week','month','prevMonth'];
filterButtons.addEventListener('change', ev => {
  const index = Array.from(filterButtons.children).indexOf(ev.target);
  const value = filterMap[index] || 'all';
  const list = document.querySelectorAll('#filterPane li[data-filter]');
  list.forEach(li => li.classList.toggle('active', li.dataset.filter === value));
  if (typeof renderImputations === 'function') renderImputations();
});

// Mostrar snackbar tras guardar (ejemplo de uso)
function showSavedSnack() {
  const sb = document.getElementById('snackSaved');
  sb.open = true;
}
