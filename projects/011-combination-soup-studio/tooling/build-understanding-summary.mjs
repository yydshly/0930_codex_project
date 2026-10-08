import {createRequire} from 'node:module';
import {readFile, writeFile, access} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

// Use the bundled workspace runtime; generated HTML has no runtime dependency.
const packagePath = process.env.SUMMARY_NODE_PACKAGE || 'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json';
const require = createRequire(packagePath);
const {marked} = await import(pathToFileURL(require.resolve('marked')).href);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = path.resolve(projectRoot, '../..');
const sourcePath = path.join(projectRoot, 'notes/understanding-summary.md');
const markdown = await readFile(sourcePath, 'utf8');
const projects = JSON.parse(await readFile(path.join(repoRoot, 'projects.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title = markdown.match(/^# (.+)$/m)?.[1];
if (!title) throw new Error('The summary needs one title.');
const reviewedCount=Number(markdown.match(/\*\*(\d+) 个研究项目\*\*/)?.[1]);
const reviewedIds=[...markdown.matchAll(/\|\s+\*\*(\d{3}) ·/g)].map(match=>match[1]);
if(!reviewedCount||new Set(reviewedIds).size!==reviewedCount)throw new Error('Summary snapshot count must match the reviewed project rows.');
const sections = [
  ['consensus','我们的理解'], ['source','原站与技能'], ['requirements','随机产品要求'],
  ['current','实际能力'], ['pages','当前页面'], ['research','网页研究索引'],
  ['quality','质量与交付'], ['evidence','依据与维护']
];
const tokens = marked.lexer(markdown.replace(/^# .+\r?\n/, ''));

// Source documents stay in the repo. Do not emit broken links into the static site.
// Preview URLs become relative paths so subpath hosting remains usable.
async function rewriteLinks(tokenList) {
  for (const token of tokenList || []) {
    if (token.type === 'link') {
      if (token.href.startsWith('http://127.0.0.1:8951/')) {
        const url = new URL(token.href);
        token.href = path.posix.relative('/projects/011-combination-soup-studio', url.pathname) || './';
        if (url.pathname.endsWith('/') && !token.href.endsWith('/')) token.href += '/';
        token.href += url.search + url.hash;
      } else if (!/^(?:https?:|#)/.test(token.href)) {
        const resolved = path.resolve(path.dirname(sourcePath), decodeURIComponent(token.href));
        const relative = path.relative(repoRoot, resolved);
        if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Source reference outside workspace: ' + token.href);
        await access(resolved);
        token.type = 'html';
        token.text = `<span class="source-ref">${escape(token.text)}<code>${escape(relative.replaceAll('\\','/'))}</code></span>`;
        delete token.tokens;
      }
    }
    if (token.tokens) await rewriteLinks(token.tokens);
    if (token.items) for (const item of token.items) await rewriteLinks(item.tokens);
    if (token.header) for (const cell of token.header) await rewriteLinks(cell.tokens);
    if (token.rows) for (const row of token.rows) for (const cell of row) await rewriteLinks(cell.tokens);
  }
}
await rewriteLinks(tokens);
let article = marked.parser(tokens, {gfm:true});
let sectionIndex = 0;
article = article.replace(/<h2>(.*?)<\/h2>/g, (_, heading) => {
  const section = sections[sectionIndex++];
  if (!section) throw new Error('Add the new section to the navigation.');
  return `${sectionIndex > 1 ? '</section>' : ''}<section id="${section[0]}" aria-labelledby="heading-${section[0]}"><h2 id="heading-${section[0]}">${heading}</h2>`;
});
if (sectionIndex !== sections.length) throw new Error('Summary/navigation section count mismatch.');
article += '</section>';
let tableIndex = 0;
article = article.replace(/<table>/g, () => `<div class="table-scroll" role="region" aria-label="对照表 ${++tableIndex}，可横向滚动" tabindex="0"><table>`).replaceAll('</table>', '</table></div>');
article = article.replace(/<a href="(https?:[^"<>]+)">/g, '<a href="$1" target="_blank" rel="noopener noreferrer">');
const nav = sections.map(([id, label], i) => `<a href="#${id}"><span>${String(i + 1).padStart(2, '0')}</span>${label}</a>`).join('');
const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="整理网页研究、产品化理解、当前能力、演示入口与质量交付规划。区分已实现能力和待建设流程。">
  <title>${escape(title)} · 研究汇总</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="understanding.css">
</head>
<body>
  <a class="skip" href="#content">跳到汇总正文</a>
  <header class="site-header">
    <a class="brand" href="./"><span class="brand-mark" aria-hidden="true">CS＋</span><span>研究与产品化<small>COMBINATION SOUP / 011</small></span></a>
    <nav aria-label="快捷入口"><a href="./">能力实验室</a><a href="foundry/studio.html?example=headphones&amp;revision=20261003-16">目标工作台</a><a href="foundry/showroom.html?example=toilet&amp;revision=20261003-16">查看马桶</a><a href="foundry/showroom.html?example=headphones&amp;revision=20261003-16#aura-configure">查看耳机</a></nav>
  </header>
  <main id="content">
    <div class="hero">
      <p class="eyebrow">FIELD NOTES · 2026 / 10 / 03</p>
      <h1>${escape(title)}</h1>
      <p class="hero-intro">把讨论形成的理解、现有实现和下一步验证放在同一个入口。</p>
      <div class="hero-meta"><span><b>${reviewedCount}</b> 项研究快照</span><span><b>8</b> 个整理章节</span><span><b>V1.7</b> 耳机验证案例</span></div>
      <a class="hero-action" href="understanding-map.html">查看全景理解图 <span aria-hidden="true">↗</span></a>
    </div>
    <div class="reading-layout">
      <aside class="contents"><p>阅读目录</p><nav aria-label="汇总章节">${nav}</nav><div class="contents-note">先确认目标与边界，<br>再选择能力与验证方法。</div></aside>
      <article class="document" aria-label="理解与网页研究汇总">${article}</article>
    </div>
  </main>
  <footer><span>内容源：notes/understanding-summary.md</span><a href="#content">回到顶部 ↑</a></footer>
</body>
</html>
`;
await writeFile(path.join(projectRoot, 'web/understanding.html'), html);
console.log(JSON.stringify({page:'web/understanding.html',sections:sectionIndex,tables:tableIndex,projects:projects.length}));
