function showSnackbar(message, variant = 'success') {
  const container = document.getElementById('snackbarContainer') || (function () {
    const c = document.createElement('div');
    c.id = 'snackbarContainer';
    c.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(c);
    return c;
  })();
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${variant} border-0`;
  toast.role = 'status';
  toast.ariaLive = 'polite';
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>`;
  container.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
  bsToast.show();
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}
