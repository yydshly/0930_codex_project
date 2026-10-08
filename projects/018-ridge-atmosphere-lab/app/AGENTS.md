# Prototype Instructions

## Reference fidelity feedback — 2026-10-03

The user rejected the first version for poor landscape layout and horseback motion. Judge the scene against the actual source frame and video, not against feature counts or a successful build. Prioritize the broad sloping meadow, curved narrow trail, asymmetric snow mountain / green shoulder composition, irregular clustered vegetation, and anatomically credible mounted posture. Verify horse facing, actual morph poses, saddle placement, foot contact, and movement cadence. Avoid a plank-shaped cape, backwards or sliding horse, symmetrical ridge road, equally spaced trees, and flat stacked cloud stripes. Keep the default landscape view unobstructed; controls should be available on demand.

The user approved the third visual revision and reported that the default view could not be dragged. Preserve that scenery while making direct canvas drag, wheel and touch take over the camera immediately, without a viewpoint jump or a hidden prerequisite mode toggle. Keep React's camera setting synchronized and retain the follow button for returning to automatic riding.

Subsequent optimization should preserve this composition and immediate camera control. Judge vegetation changes in matched actual captures: avoid isolated dark stamped clumps, blue-gray bare soil, or reduced meadow density. Keep the measured horse gait and travel speed together; test real hoof contact, hand/rein attachment, and deterministic pause/reset when changing rider motion. Verify PNG capture after any frame-buffer optimization.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
