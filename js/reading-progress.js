(function() {
  const chapters = [
    { id: 1, title: 'Capítulo 1', status: 'done', description: 'Introducción breve y conceptos base.' },
    { id: 2, title: 'Capítulo 2', status: 'in-progress', description: 'Sección actualmente en progreso.' },
    { id: 3, title: 'Capítulo 3', status: 'pending', description: 'Próximo capítulo pendiente de leer.' },
    { id: 4, title: 'Capítulo 4', status: 'pending', description: 'Capítulo siguiente en la cola de lectura.' }
  ];

  document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('chapterStatusList');
    const openBtn = document.getElementById('openChapterProgress');
    if (!listEl || !openBtn) return;

    renderList(listEl);
    openBtn.addEventListener('click', () => {
      const current = getCurrentChapter();
      if (!current) {
        alert('No hay capítulos pendientes.');
        return;
      }
      openChapterPopup(current, listEl);
    });
  });

  function getCurrentChapter() {
    return chapters.find(ch => ch.status === 'in-progress') || chapters.find(ch => ch.status === 'pending');
  }

  function markChapterCompleted(chapter) {
    chapter.status = 'done';
  }

  function advanceToNextPending() {
    const next = chapters.find(ch => ch.status === 'pending');
    if (next) next.status = 'in-progress';
  }

  function renderList(listEl) {
    listEl.innerHTML = '';
    chapters.forEach(chapter => {
      const row = document.createElement('div');
      row.className = `chapter-progress__item chapter-progress__item--${chapter.status}`;
      row.innerHTML = `
        <div class="chapter-progress__title">${chapter.title}</div>
        <div class="chapter-progress__meta">${chapter.description}</div>
        <div class="chapter-progress__status">${formatStatus(chapter.status)}</div>
      `;
      listEl.appendChild(row);
    });
  }

  function formatStatus(status) {
    if (status === 'done') return 'Leído';
    if (status === 'in-progress') return 'En progreso';
    return 'Pendiente';
  }

  function openChapterPopup(chapter, listEl) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop tasks-popup';

    const modal = document.createElement('div');
    modal.className = 'modal chapter-progress__modal';
    modal.innerHTML = `
      <header class="chapter-progress__modal-header">
        <h3>${chapter.title}</h3>
        <button class="close" aria-label="Cerrar">×</button>
      </header>
      <div class="chapter-progress__modal-body">
        <p>${chapter.description}</p>
        <p>Consulta el capítulo completo como en la opción de búsqueda y decide si quieres marcarlo.</p>
      </div>
      <footer class="chapter-progress__modal-footer">
        <button class="Buttons primary" data-action="read">Ir a la lectura</button>
        <button class="Buttons" data-action="close">Cerrar</button>
      </footer>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const closeBtn = modal.querySelector('.close');
    const readBtn = modal.querySelector('[data-action="read"]');
    const closeFooterBtn = modal.querySelector('[data-action="close"]');

    const handleEsc = e => { if (e.key === 'Escape') closePopup(); };
    document.addEventListener('keydown', handleEsc);

    function askCurrentFlow() {
      prompt('¿Cómo lo haces actualmente?');
    }

    function closePopup() {
      backdrop.remove();
      document.removeEventListener('keydown', handleEsc);
      askCurrentFlow();
      markChapterCompleted(chapter);
      advanceToNextPending();
      renderList(listEl);
    }

    closeBtn.addEventListener('click', closePopup);
    closeFooterBtn.addEventListener('click', closePopup);

    readBtn.addEventListener('click', () => {
      const shouldMark = confirm('¿Quieres marcar este capítulo al ir a la lectura?');
      if (shouldMark) {
        markChapterCompleted(chapter);
        advanceToNextPending();
        renderList(listEl);
      }
      askCurrentFlow();
      document.getElementById('chapterProgressCard')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
})();
