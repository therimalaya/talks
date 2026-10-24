document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('presentations-container');
  const sortBySelect = document.getElementById('sort-by');
  const typeFilterSelect = document.getElementById('type-filter');
  const loadingSpinner = document.getElementById('loading-spinner');
  const endMessage = document.getElementById('end-of-content');

  let all = [], filtered = [], shown = 0, isLoading = false;
  const batch = 10;
  let columns = [], colHeights = [];
  let sortOrder = 'date-desc', currentType = 'all';

  const getCols = () => window.innerWidth < 576 ? 1 : window.innerWidth < 768 ? 2 : 3;

  function initColumns() {
    container.innerHTML = '';
    columns = [];
    colHeights = [];
    const n = getCols();
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'masonry-column';
      c.style.width = `${100 / n}%`;
      container.appendChild(c);
      columns.push(c);
      colHeights.push(0);
    }
  }

  const sortData = (arr) => arr.slice().sort((a, b) => {
    if (sortOrder.startsWith('date')) {
      const cmp = new Date(a.date) - new Date(b.date);
      return sortOrder === 'date-desc' ? -cmp : cmp;
    } else {
      const cmp = a.title.localeCompare(b.title);
      return sortOrder === 'title-desc' ? -cmp : cmp;
    }
  });

  function applyFilters() {
    const base = currentType === 'all' ? all : all.filter(p => p.type === currentType);
    filtered = sortData(base);
  }

  function createCard(p) {
    const card = document.createElement('div');
    let pub_date = new Date(p.date)
    let date_str = pub_date.toDateString();
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.preview || 'https://via.placeholder.com/400x250?text=No+Preview'}"
           class="card-img-top" alt="Preview of ${p.title}" loading="lazy">
      <div class="card-body">
        <h5 class="card-title">${p.title}</h5>
        <p class="card-text"><small class="text-muted">${date_str} • ${p.location} • ${p.type}</small></p>
        <div class="card-links">
          ${p.html_path ? `<a class="card-link" target="_blank" href="${p.folder}/${p.html_path}">View HTML</a>` : ''}
          ${p.pdf_path  ? `<a class="card-link" target="_blank" href="${p.folder}/${p.pdf_path}">View PDF</a>` : ''}
        </div>
      </div>`;
    return card;
  }

  function appendCard(card) {
    const i = colHeights.indexOf(Math.min(...colHeights));
    columns[i].appendChild(card);
    colHeights[i] += card.offsetHeight + 20;
  }

  function loadBatch() {
    if (isLoading) return;
    isLoading = true;
    loadingSpinner.classList.remove('d-none');

    const next = filtered.slice(shown, shown + batch);
    if (!next.length) {
      loadingSpinner.classList.add('d-none');
      endMessage.classList.remove('d-none');
      isLoading = false;
      return;
    }

    setTimeout(() => {
      next.forEach(p => appendCard(createCard(p)));
      shown += next.length;
      loadingSpinner.classList.add('d-none');
      isLoading = false;

      if (container.offsetHeight < window.innerHeight && shown < filtered.length) loadBatch();
      if (shown >= filtered.length) endMessage.classList.remove('d-none');
    }, 150);
  }

  function refresh() {
    shown = 0;
    endMessage.classList.add('d-none');
    initColumns();
    loadBatch();
  }

  sortBySelect.addEventListener('change', e => {
    sortOrder = e.target.value;
    applyFilters();
    refresh();
  });

  typeFilterSelect.addEventListener('change', e => {
    currentType = e.target.value;
    applyFilters();
    refresh();
  });

  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
        !isLoading && shown < filtered.length) loadBatch();
  });

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (getCols() !== columns.length) refresh();
    }, 150);
  });

  fetch('presentations.json')
    .then(r => r.json())
    .then(data => {
      all = data;
      // populate type dropdown
      const types = [...new Set(all.map(p => p.type).filter(Boolean))].sort();
      types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t[0].toUpperCase() + t.slice(1);
        typeFilterSelect.appendChild(opt);
      });
      applyFilters();
      initColumns();
      loadBatch();
    })
    .catch(err => console.error('Error fetching presentations:', err));
});

