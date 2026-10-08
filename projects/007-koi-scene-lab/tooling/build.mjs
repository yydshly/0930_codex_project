import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(root + 'web', { recursive: true });
await build({ entryPoints: [root + 'src/main.js'], bundle: true, format: 'esm', minify: true,
  sourcemap: false, outfile: root + 'web/app.js', legalComments: 'linked', target: ['es2022'],
  nodePaths: [root + 'tooling/node_modules'] });
await copyFile(root + 'tooling/node_modules/three/LICENSE', root + 'web/THREE-LICENSE.txt');
console.log('Built Koi Scene Lab: local Three.js r160, scene and GLB loader.');
