# 🌸 Koi Pond Garden

An ultra-realistic, interactive Japanese koi pond garden — rendered in real time in the browser with [Three.js](https://threejs.org) and custom shaders. The **entire garden lives in one HTML file**: no build step, no bundler, no asset folder. Every mesh, texture, sound and animation is generated procedurally in code. The only external dependencies are Three.js and dat.gui, loaded from a CDN.

**▶️ [Live demo](https://souranyp-stack.github.io/koi-pond-garden/)** · one file · works on desktop and mobile
&nbsp;·&nbsp; ⭐ **If you like it, star the repo** — it helps others find it.

![Koi pond garden — live footage](demo.gif)

<sub>Recorded live in the browser. ▲ Above: the whole scene runs from one HTML file. Below: the pond from above.</sub>

![Koi pond garden — from above](screenshot.jpg)

## Features

- **20 koi across 18 real varieties** (Kohaku, Sanke, Showa, Ogon, Asagi, Tancho, Utsuri, butterfly long-fins, Gin Rin sparklers, Doitsu and more) in small, medium and jumbo sizes, each with procedurally generated scales, patterns and fins.
- **Physically simulated water** — a live ripple simulation plus Gerstner waves, real reflection and refraction passes, caustics, Beer–Lambert absorption and crystal-clear water by default.
- **A full garden** — an arched bridge, a pavilion, a rock waterfall, sakura, a red maple, a bamboo grove, sacred lotus, water lilies, iris beds, stone lanterns and distant mountains.
- **Pond life** — a frog that leaps when you click it, a turtle sunning on a rock, and dragonflies darting over the surface.
- **Feed and stroke the koi** — a first-person hand reaches in to sprinkle food (the fish crowd and jostle) or to gently stroke a fish that swims up to your hand.
- **Weather and seasons** — sunny, rain, autumn and snowy winter, each with matching light, fog and water.
- **A cinematic film tour** that flies through the whole garden, above and below the water.
- **Procedural audio** — water, leaves, the waterfall, a bamboo *shishi-odoshi* knock and more, all synthesized with the Web Audio API.

## Controls

| Key | Action | | Key | Action |
|---|---|---|---|---|
| `C` | Cinematic / manual camera | | `E` | Feed the koi |
| `P` | Hold the current shot | | `G` | Stroke a koi |
| `O` | Freeze time | | `K` | Follow a koi |
| `V` | Clean view (hide UI) | | `T` | Change weather / season |
| `M` | Mute / unmute | | `H` | Show the control panel |
| `I` | Show / hide the guide | | | |

**Manual camera:** drag to look, `W` `A` `S` `D` to move, `Q` / `Space` down / up, `Shift` to move faster. Click the water for ripples, or click the frog to make it leap.

## Run it locally

It's a single file, so you can just open it — but a local server avoids browser security limits on textures and audio:

```bash
git clone https://github.com/souranyp-stack/koi-pond-garden.git
cd koi-pond-garden
python3 -m http.server 8765
# then open http://localhost:8765/koi-pond.html
```

Or simply double-click `koi-pond.html` to open it directly in your browser.

## How it's made

Everything you see is built by code when the page loads — there are no `.png`, `.glb`, `.mp3` or font files anywhere:

- **Geometry** (koi bodies, rocks, the bridge, trees, the hand) is generated from curves, noise and instancing at runtime.
- **Textures** (koi patterns, scales, bark, stone, the pond floor) are drawn into canvases and data arrays in code.
- **Water, lighting, shadows, caustics and depth of field** are custom GLSL shaders running on the GPU via WebGL.
- **Sound** is synthesized with the Web Audio API — no recordings.

That's why the whole thing is one ~560 KB text file instead of a folder of megabytes of assets, and why anyone can open it and read exactly how any part works.

## The prompt

This project was built by directing [Claude](https://claude.ai) in rounds — describe, run, screenshot, measure, fix, repeat. The [`prompt/`](prompt/) folder contains the one-shot prompt that specifies the whole build, so you can rebuild a garden like this yourself:

- [`prompt/one-shot-prompt.txt`](prompt/one-shot-prompt.txt) — the full specification, paste into a fresh session.
- [`prompt/edit-existing-file.txt`](prompt/edit-existing-file.txt) — a short prompt for editing this file without rewriting it.

## Tech

- [Three.js](https://threejs.org) r160 (WebGL renderer)
- [dat.gui](https://github.com/dataarts/dat.gui) for the control panel
- Custom GLSL shaders, procedural textures, and the Web Audio API
- No build step, no framework, no assets

## Show your support

If this made you smile, please **⭐ star the repo** and share it — it genuinely helps more people find it. Built something with the [prompt](prompt/)? I'd love to see it.

## License

[MIT](LICENSE) © 2026 Sourany Phomhome. Free to use, modify and share, including commercially — just keep the copyright notice. A mention or a star is always appreciated. ⭐

*Built with [Claude](https://claude.ai).*
