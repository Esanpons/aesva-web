// Extra UI behavior for Material Design migration

// Bootstrap offcanvas control for navigation drawer
const drawerToggle = document.getElementById('menuBtn');
if (drawerToggle) {
  drawerToggle.addEventListener('click', () => {
    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance('#mainDrawer');
    offcanvas.toggle();
  });
}

// Sync segmented buttons with legacy filter list
const segButtons = document.querySelectorAll('#viewButtons md-outlined-segmented-button');
segButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('#viewButtons md-outlined-segmented-button[selected]')?.removeAttribute('selected');
    btn.setAttribute('selected', '');
    const value = btn.dataset.filter;
    const active = document.querySelector('#filterPane .filter-list li.active');
    const target = document.querySelector(`#filterPane .filter-list li[data-filter="${value}"]`);
    if (active && target) {
      active.classList.remove('active');
      target.classList.add('active');
    }
    if (typeof renderImputations === 'function') renderImputations();
  });
});

// Snackbar helper
function showSnackbar(msg) {
  const bar = document.getElementById('mainSnackbar');
  if (!bar) return;
  bar.labelText = msg;
  bar.open = true;
}

// Expose globally
window.showSnackbar = showSnackbar;
