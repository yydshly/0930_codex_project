(() => {
  const pages = [...document.querySelectorAll('.page')];
  const nav = [...document.querySelectorAll('[data-nav]')];
  function showPage() {
    const requested = location.hash.slice(1) || 'overview';
    const id = pages.some(p => p.id === requested) ? requested : 'overview';
    pages.forEach(p => { p.hidden = p.id !== id; });
    nav.forEach(a => {
      if (a.dataset.nav === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = `${nav.find(a => a.dataset.nav === id).textContent.trim()} · Learn Harness Engineering`;
    window.scrollTo(0, 0);
  }
  const search = document.querySelector('#cap-search');
  const category = document.querySelector('#cap-category');
  const status = document.querySelector('#cap-status');
  const cards = [...document.querySelectorAll('.cap-card')];
  function filter() {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    cards.forEach(card => {
      const match = (!query || card.dataset.search.includes(query)) && (!category.value || card.dataset.category === category.value) && (!status.value || card.dataset.status === status.value);
      card.hidden = !match;
      if (match) count++;
    });
    document.querySelector('#cap-count').textContent = `${count} / ${cards.length} 项`;
    document.querySelector('#empty-state').hidden = count !== 0;
  }
  search.addEventListener('input', filter);
  category.addEventListener('change', filter);
  status.addEventListener('change', filter);
  document.querySelector('#reset-filters').addEventListener('click', () => { search.value = ''; category.value = ''; status.value = ''; filter(); });
  let previousDetails = [];
  window.addEventListener('beforeprint', () => { previousDetails = cards.map(c => c.open); cards.forEach(c => { c.open = true; }); });
  window.addEventListener('afterprint', () => { cards.forEach((c,i) => { c.open = previousDetails[i] || false; }); });
  document.querySelector('#print-report').addEventListener('click', () => window.print());
  window.addEventListener('hashchange', showPage);
  showPage();
  filter();
})();
