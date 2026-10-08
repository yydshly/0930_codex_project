// Native archive links must reveal their destination before fragment scrolling.
const homeArchiveIds = new Set(['play-archive', 'play-lab', 'visual-archive']);

function revealHomeArchive(id) {
  if (!homeArchiveIds.has(id)) return;
  const target = document.getElementById(id);
  const details = target?.closest('details');
  if (details) details.open = true;
  return target;
}

document.querySelectorAll('[data-home-archive]').forEach(link => {
  link.addEventListener('click', () => revealHomeArchive(link.dataset.homeArchive));
});

function revealHomeFragment() {
  const target = revealHomeArchive(location.hash.slice(1));
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
}

window.addEventListener('hashchange', revealHomeFragment);
// Preserve the archive landing point when the old lazy preview changes height.
const homePreview = document.getElementById('prototypes');
if (homePreview) new ResizeObserver(revealHomeFragment).observe(homePreview);
revealHomeFragment();
