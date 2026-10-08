import { cpSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'app/dist/client');
if (!existsSync(path.join(source, 'index.html'))) throw new Error('Run app build first');
mkdirSync(path.join(root, 'web'), { recursive: true });
const clientAssets = path.join(source, 'assets');
const publicAssets = path.join(root, 'web/assets');
if (existsSync(publicAssets)) {
  for (const entry of readdirSync(publicAssets, { withFileTypes: true })) {
    if (entry.isFile() && /^index-[A-Za-z0-9_-]+\.(js|css)$/.test(entry.name)
      && !existsSync(path.join(clientAssets, entry.name))) {
      unlinkSync(path.join(publicAssets, entry.name));
    }
  }
}
cpSync(source, path.join(root, 'web'), { recursive: true });
for (const file of ['understanding.html', 'understanding.css']) {
  cpSync(path.join(root, 'publication', file), path.join(root, 'web', file));
}
const captures = ['explorer-v2-camp-polished.png', 'explorer-v2-production.png',
  'explorer-v2-route.png', 'explorer-v2-creek-photo.png', 'explorer-lookout-final.png',
  'explorer-v2-mobile-final.png', 'explorer-v2-camp-polished-export.png',
  'explorer-v2-creek-export.png', 'explorer-v2-comparison.jpg', 'explorer-v2-camp-comparison.jpg'];
mkdirSync(path.join(root, 'web/research-assets'), { recursive: true });
for (const file of captures) cpSync(path.join(root, 'assets', file), path.join(root, 'web/research-assets', file));
mkdirSync(path.join(root, 'web/downloads'), { recursive: true });
for (const file of ['20261003-polished-baseline.zip', '20261003-polished-baseline.json']) {
  cpSync(path.join(root, '../018-ridge-atmosphere-lab/releases', file), path.join(root, 'web/downloads', file));
}
console.log('Built portable static scene in web/');
