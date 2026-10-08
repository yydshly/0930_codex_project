import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({entryPoints:{app:root+'src/main.js',world:root+'src/world-main.js',studio:root+'src/companion-studio.js',splat:root+'src/splat-main.js','reference-plush':root+'src/reference-plush.js',project:root+'src/project-overview.js'},nodePaths:[root+'tooling/node_modules'],bundle:true,format:'esm',minify:true,outdir:root+'web',legalComments:'linked'});
console.log('Built Plush Lab, Plush World, Companion Studio and Gaussian Splat Lab with the local native Gaussian asset.');
