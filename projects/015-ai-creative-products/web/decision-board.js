(() => {
  'use strict';

  const initialise = () => {
    const root = document.getElementById('product-decision-board');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    const products = (window.RESEARCH_DATA?.products || []).filter(product => product?.id);
    if (!products.length) {
      root.innerHTML = '<p class="decision-empty">产品资料暂未加载，请刷新后重试。</p>';
      return;
    }

    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
    const productMap = new Map(products.map(product => [product.id, product]));
    const defaultIds = products.filter(product => product.priority === '优先验证').slice(0, 3).map(product => product.id);
    const storageKey = 'creative-products:decision-board:v1';
    let selectedIds = [...defaultIds];

    // 压缩现有 connection 字段，保留已实现基础和重要边界，不增加能力或接口。
    const reuseSummaries = {
      showroom: '011：原创三维灯具展示、热点、选配和需求单；014：底座研究，尚未实施。',
      'brand-film': '006：实际 24 秒代码短片；008：原创文字运动、时间轴和 JSON 配方。上游非商业许可不直接用于商用。',
      'music-visual': '006：歌曲能量分析与全曲代码动画；008：原创时间轴和配方恢复。',
      training: '009：维护流程原型；010：任务门槛、关卡完成和本地保存。真实培训效果待验证。',
      'causal-world': '010：原创世界与任务；011：参数和 A/B 比较。科学规律仍需独立验证。',
      'brand-game': '009：原创揭幕、内容解锁与事件导出；010：原创可玩循环和存档。',
      'physics-lab': '009：本地刚体、参数与物理测试；010：重量、动作与简化碰撞规则。',
      'recipe-engine': '006：输入快照与制作记录；008：JSON 保存恢复；011：需求单和交付契约。'
    };

    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(stored)) {
        const valid = [...new Set(stored.filter(id => typeof id === 'string' && productMap.has(id)))].slice(0, 3);
        if (stored.length === 0 || valid.length) selectedIds = valid;
      }
    } catch {
      // 文件预览、隐私模式或无效存档不影响本次比较。
    }

    root.innerHTML = `
      <div class="decision-heading">
        <div>
          <p class="decision-kicker">产品决策对比</p>
          <h3 id="decision-title">选 2–3 个方向，看看先做哪个。</h3>
          <p class="decision-description">从真实任务、第一版和验收条件比较。默认展示三项优先方向；这些是待验证的产品构想。</p>
        </div>
        <div class="decision-actions">
          <button type="button" data-decision-action="reset">恢复优先方向</button>
          <button type="button" data-decision-action="clear">清空选择</button>
        </div>
      </div>
      <div class="decision-options" role="group" aria-label="选择最多三个产品方向">
        ${products.map(product => `<button type="button" class="decision-option" data-compare-id="${escape(product.id)}" aria-pressed="false"><span class="decision-option-mark" aria-hidden="true">＋</span><span>${escape(product.title)}</span></button>`).join('')}
      </div>
      <p class="decision-status" role="status" aria-live="polite" aria-atomic="true"></p>
      <div class="decision-empty" hidden><h4>还没有选择对比方向</h4><p>点选上面的产品，或恢复三项优先方向。选两项以上，更容易判断任务和交付的差别。</p></div>
      <div class="decision-grid" aria-label="所选产品对比"></div>
    `;
    root.setAttribute('aria-labelledby', 'decision-title');

    const options = [...root.querySelectorAll('[data-compare-id]')];
    const grid = root.querySelector('.decision-grid');
    const status = root.querySelector('.decision-status');
    const empty = root.querySelector('.decision-empty');
    const clearButton = root.querySelector('[data-decision-action="clear"]');

    const save = () => {
      try { localStorage.setItem(storageKey, JSON.stringify(selectedIds)); } catch { /* 比较继续可用。 */ }
    };

    const entry = (title, value) => `<div class="decision-entry"><dt>${title}</dt><dd>${escape(value)}</dd></div>`;
    const representative={showroom:1,'brand-film':4,'music-visual':6,training:5,'causal-world':9,'brand-game':8,'physics-lab':10,'recipe-engine':6};
    const renderCard = product => `
      <article class="decision-card" aria-label="${escape(product.title)}对比内容">
        <header class="decision-card-heading">
          <div class="decision-card-meta"><span>${escape(product.priority)}</span><span>${escape(product.difficulty)}难度</span></div>
          <div class="decision-card-title"><h4>${escape(product.title)}</h4><button type="button" class="decision-remove" data-remove-id="${escape(product.id)}" aria-label="移除${escape(product.title)}的对比" title="移出对比">×</button></div>
        </header>
        <div class="decision-effect-preview" data-effect-case="${representative[product.id] || product.caseIds?.[0]}" aria-label="${escape(product.title)}参考案例效果"></div>
        <dl class="decision-facts">
          ${entry('真实任务', product.job)}
          ${entry('输入', product.input)}
          ${entry('输出', product.output)}
          <div class="decision-entry"><dt>第一版</dt><dd><ol>${(product.mvp || []).map(item => `<li>${escape(item)}</li>`).join('')}</ol></dd></div>
          ${entry('首项验收', (product.acceptance || [])[0] || '尚需定义验收条件')}
          ${entry('复用基础', reuseSummaries[product.id] || product.connection)}
          ${entry('难点', product.risk)}
        </dl>
        <button type="button" class="decision-read" data-product-link="${escape(product.id)}">阅读计划 <span aria-hidden="true">↗</span><span class="sr-only">：${escape(product.title)}</span></button>
      </article>
    `;

    const render = message => {
      options.forEach(button => {
        const active = selectedIds.includes(button.dataset.compareId);
        button.setAttribute('aria-pressed', String(active));
        button.querySelector('.decision-option-mark').textContent = active ? '✓' : '＋';
      });
      const selected = selectedIds.map(id => productMap.get(id)).filter(Boolean);
      grid.dataset.count = String(selected.length);
      window.EffectGallery?.releaseWithin(grid);
      grid.innerHTML = selected.map(renderCard).join('');
      grid.querySelectorAll('[data-effect-case]').forEach(container=>window.EffectGallery?.renderInto(container,[Number(container.dataset.effectCase)]));
      empty.hidden = selected.length > 0;
      clearButton.disabled = selected.length === 0;
      const hint = selected.length === 3 ? '移除一项后，可加入其他方向。' : selected.length === 1 ? '再选一项，比较任务与交付的差别。' : '可从上方添加或移除方向。';
      status.textContent = message || `已选 ${selected.length} / 3 项。${hint}`;
    };

    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      // data-product-link 由 app.js 的 document 级点击处理器接管。
      if (button.dataset.productLink) return;

      if (button.dataset.compareId) {
        const id = button.dataset.compareId;
        if (selectedIds.includes(id)) selectedIds = selectedIds.filter(value => value !== id);
        else if (selectedIds.length >= 3) {
          status.textContent = '最多同时对比 3 项，请先移除一个已选方向。';
          return;
        } else selectedIds.push(id);
      } else if (button.dataset.removeId) {
        const id = button.dataset.removeId;
        selectedIds = selectedIds.filter(value => value !== id);
        save();
        render();
        options.find(option => option.dataset.compareId === id)?.focus({preventScroll: true});
        return;
      } else if (button.dataset.decisionAction === 'clear') selectedIds = [];
      else if (button.dataset.decisionAction === 'reset') selectedIds = [...defaultIds];
      else return;

      save();
      render();
    });

    render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise, {once: true});
  else initialise();
})();
