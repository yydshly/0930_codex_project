import { projectSubject } from './direction-wildlife-engine.js';

export const WILDLIFE_ASSET_NAMES = ['landscape.png', 'animals-atlas.png'];
const crop = { heron: [109, 28, 561, 612], kingfisher: [708, 116, 1144, 599], deer: [108, 643, 564, 1211], flying: [674, 674, 1179, 1147] };
export function createWildlifeRenderer(canvas, { images, document = globalThis.document } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) throw new Error('浏览器未能创建 Canvas 取景画面');
  const [landscape, atlas] = images; canvas.width = 1600; canvas.height = 900; let disposed = false;
  function render(w) {
    if (disposed) return; const camera = w.camera, width = canvas.width, height = canvas.height;
    ctx.fillStyle = '#72886b'; ctx.fillRect(0, 0, width, height);
    // Camera bounds keep the original animal-free landscape inside the sensor.
    // The same normalized projection places every subject in the live frame.
    ctx.drawImage(landscape, ((-camera.x) * camera.zoom + .5) * width, ((-camera.y) * camera.zoom + .5) * height, width * camera.zoom, height * camera.zoom);
    for (const subject of [...w.subjects].sort((a, b) => a.y + a.height / 2 - b.y - b.height / 2)) {
      const p = projectSubject(camera, subject); if (p.right <= 0 || p.left >= 1 || p.bottom <= 0 || p.top >= 1) continue;
      const flying = subject.id === 'kingfisher' && (subject.state === 'flying' || subject.activity === 'flying' || subject.state === 'flight'), box = crop[flying ? 'flying' : subject.id]; if (!box) continue;
      ctx.drawImage(atlas, box[0], box[1], box[2] - box[0], box[3] - box[1], p.left * width, p.top * height, p.width * width, p.height * height);
    }
  }
  function capture() {
    if (disposed) throw new Error('取景画面已关闭');
    const copy = (width, height) => { const output = document.createElement('canvas'); output.width = width; output.height = height; const context = output.getContext('2d'); if (!context) throw new Error('照片导出未能创建画布'); context.drawImage(canvas, 0, 0, width, height); return output.toDataURL('image/png'); };
    return { fullURL: copy(960, 540), thumbURL: copy(256, 144), width: 960, height: 540 };
  }
  return { ready: true, render, capture, dispose() { disposed = true; } };
}
