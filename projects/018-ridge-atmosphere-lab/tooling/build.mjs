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
console.log('Built portable static scene in web/');
