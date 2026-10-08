# Alpine foliage card asset

Generated with the built-in image generation tool on 2026-10-03. This is a new generated asset, with no source image inputs. `transparent_background: true` was requested. The original RGBA pixels and alpha were copied without transformation.

- Runtime asset: `../app/public/assets/foliage-clump.png`
- Original generated file: `D:/codex/home/generated_images/01a10033-30fb-75f3-a182-82d40adcc05d/exec-8c9f530d-e1a6-4868-8195-d990d9487ef1.png`
- Actual dimensions: 1254 × 1254 pixels.
- Format: RGBA PNG; alpha range 0–255; 63.34% of pixels have nonzero alpha.
- Intended use: repeated alpha-tested foliage cards in the 3D meadow. It is not a scene background.
- Inspection: the clump has dense fine grass, small heather leaves and fern-like sprigs, muted olive greens and an irregular silhouette. No opaque red pixels were detected: red-dominant fringe pixels have alpha 1–7/255 and should be rejected by the material's alpha test. Use alpha testing with a threshold around 0.3–0.5 to remove residual almost-transparent edge colors.

## Exact generation prompt

```text
Use case: photorealistic-natural
Asset type: a single game foliage alpha texture for crossed-plane 3D cards.
Subject: One dense low alpine meadow clump composed of many fine short green grasses plus tiny leafy heather and fern sprigs. Real-world clump size about 40 cm wide and 35 cm high. Roughly 100 small leaves and fine blades densely layered, with an airy irregular crown, realistic natural botanical detail.
Composition/framing: Square canvas, preferably 1024 x 1024. Eye-height camera looking nearly straight at the clump, with only a slight downward 5 degree angle, suitable for a crossed-plane foliage billboard. Fill the central 90 percent of the canvas above a consistent base at the bottom 10 percent, with transparent margin. The entire clump must remain uncropped. Single clump only.
Color palette: Muted grey olive and blue green, dark green shadowed interior, subtle muted wheat colored tips. No silver white leaves, no bright lime green.
Lighting: Soft diffuse overcast illumination, uniform neutral material photography, no baked directional shadow.
Background: Genuine alpha transparency.
Constraints: No pot, no soil, no ground plane, no cast shadow, no white halo, no text, no border, no atlas panels. This is a single foliage billboard asset, not a full scene or screenshot.
```
