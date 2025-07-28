// MDC & Bootstrap UI helpers
window.mdcAutoInit = mdc.autoInit;
mdcAutoInit();

const drawerEl = document.querySelector('.mdc-drawer');
const topAppBarEl = document.querySelector('.mdc-top-app-bar');
let drawer;
if (drawerEl) {
  drawer = mdc.drawer.MDCDrawer.attachTo(drawerEl);
  document.getElementById('menu-btn').addEventListener('click', () => {
    drawer.open = !drawer.open;
  });
}
if (topAppBarEl) {
  const topAppBar = mdc.topAppBar.MDCTopAppBar.attachTo(topAppBarEl);
  topAppBar.setScrollTarget(document.querySelector('main'));
  topAppBar.listen('MDCTopAppBar:nav', () => {
    if (drawer) drawer.open = !drawer.open;
  });
}

function adaptDrawer() {
  if (!drawerEl) return;
  if (window.innerWidth < 600) {
    drawerEl.classList.add('mdc-drawer--modal');
    drawerEl.classList.remove('mdc-drawer--dismissible');
  } else {
    drawerEl.classList.add('mdc-drawer--dismissible');
    drawerEl.classList.remove('mdc-drawer--modal');
  }
}
window.addEventListener('resize', adaptDrawer);
adaptDrawer();

// Segmented buttons for filters
const filterGroup = document.getElementById('viewFilters');
if (filterGroup) {
  filterGroup.querySelectorAll('button[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      filterGroup.querySelector('.mdc-segmented-button__segment--selected')?.classList.remove('mdc-segmented-button__segment--selected');
      btn.classList.add('mdc-segmented-button__segment--selected');
      btn.setAttribute('aria-pressed', 'true');
      window.renderImputations && window.renderImputations();
    });
  });
}

window.activeFilter = function() {
  const sel = document.querySelector('#viewFilters .mdc-segmented-button__segment--selected');
  return sel ? sel.dataset.filter : 'all';
};

window.showSnackbar = function(msg) {
  const sb = mdc.snackbar.MDCSnackbar.attachTo(document.getElementById('appSnackbar'));
  sb.labelText = msg;
  sb.open();
};

window.confirmDialog = function(msg) {
  return new Promise(res => {
    const dlgEl = document.getElementById('confirmDialog');
    const dlg = mdc.dialog.MDCDialog.attachTo(dlgEl);
    dlgEl.querySelector('#confirmDialog-content').textContent = msg;
    dlg.open();
    dlg.listen('MDCDialog:closed', e => {
      res(e.detail.action === 'yes');
    }, { once: true });
  });
};
