(() => {
  const rows = [...document.querySelectorAll('[data-path]')];
  document.querySelector('#source-search').addEventListener('input', event => {
    const q = event.target.value.trim().toLowerCase();
    let count = 0;
    rows.forEach(row => { row.hidden = !row.dataset.path.includes(q); if (!row.hidden) count++; });
    document.querySelector('#source-count').textContent = `${count.toLocaleString('zh-CN')} / ${rows.length.toLocaleString('zh-CN')} 个文件`;
  });
})();
