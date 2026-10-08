/* Optional reading aids. All content and native details work without JavaScript. */
const products = [...document.querySelectorAll('.product')];
const controls = document.querySelector('#product-controls');
if (controls && products.length) {
  controls.hidden = false;
  document.querySelector('#expand-products')?.addEventListener('click', () => {
    for (const product of products) product.open = true;
  });
  document.querySelector('#collapse-products')?.addEventListener('click', () => {
    for (const product of products) product.open = false;
  });
}

const links = [...document.querySelectorAll('.section-nav a')];
const sections = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window && sections.length) {
  const visible = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target.id);
      else visible.delete(entry.target.id);
    }
    const current = sections.find(section => visible.has(section.id));
    for (const link of links) {
      if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: '-70px 0px -55% 0px', threshold: 0 });
  for (const section of sections) observer.observe(section);
}
