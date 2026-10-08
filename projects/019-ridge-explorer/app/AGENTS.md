# Prototype Instructions

## Reference fidelity feedback — 2026-10-03

The user rejected the first version for poor landscape layout and horseback motion. Judge the scene against the actual source frame and video, not against feature counts or a successful build. Prioritize the broad sloping meadow, curved narrow trail, asymmetric snow mountain / green shoulder composition, irregular clustered vegetation, and anatomically credible mounted posture. Verify horse facing, actual morph poses, saddle placement, foot contact, and movement cadence. Avoid a plank-shaped cape, backwards or sliding horse, symmetrical ridge road, equally spaced trees, and flat stacked cloud stripes. Keep the default landscape view unobstructed; controls should be available on demand.

The user approved the third visual revision and reported that the default view could not be dragged. Preserve that scenery while making direct canvas drag, wheel and touch take over the camera immediately, without a viewpoint jump or a hidden prerequisite mode toggle. Keep React's camera setting synchronized and retain the follow button for returning to automatic riding.

Subsequent optimization should preserve this composition and immediate camera control. Judge vegetation changes in matched actual captures: avoid isolated dark stamped clumps, blue-gray bare soil, or reduced meadow density. Keep the measured horse gait and travel speed together; test real hoof contact, hand/rein attachment, and deterministic pause/reset when changing rider motion. Verify PNG capture after any frame-buffer optimization.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.


## 019 extension scope
The user explicitly requested saving current capabilities and extending this scene into controllable horseback exploration. Treat the 018 release as immutable input and edit only 019. Preserve the approved palette, rider, direct drag, weather, pause/reset, PNG export and licenses. Add user-controlled riding, connected routes, visible landmarks, discovery and photography with compact UI. Clear movement inputs on blur, pause and dialogs.

## 019 completion scope — 2026-10-03

The user's subsequent “继续补全” continues the existing 019 exploration prototype. Complete connected-trail navigation, brief stops at each tour landmark, nearby place cards and place photography, optional ride recovery, and opt-in ambience within the existing finite terrain. Preserve the default landscape composition and compact, folded controls. Show place interactions when nearby; avoid permanently expanding the default interface for secondary features.

Navigation must follow the actual connected trail graph and give remaining trail distance and a return-to-trail waypoint when off the path. Tour stops occur within 2 metres of each landmark, last 12 seconds, and allow the user to continue early. Nearby place photography changes the camera framing without moving the horse; retain pause, focus and movement-input clearing during dialogs and photography.

Save valid rider position and heading, travelled distance, world time, weather and photographic settings in the current browser. Opening the page must keep the approved default starting view; offer “继续上次骑行” at the start and restore only after the user chooses it. Resume with a stationary horse in manual mode. Returning to the start must preserve the previous valid ride and discovered landmarks. Treat unavailable or invalid local storage as optional, never as a scene-start failure.

Sound starts disabled and AudioContext activation must come directly from the user's sound toggle. Do not persist or enable sound through a ride snapshot. Describe the wind, creek, fire and three-beat hoof sounds as procedural audio, not real recordings. Derive location ambience from actual world distance and hoof cadence from actual travelled metres; mute and discard hoof backlog on pause, photography, hidden pages or unavailable output. Reuse audio nodes and clean up contexts and late activation promises on disposal.

Keep v1 screenshots, bundle hashes and validation records clearly labelled as history. Record v2 build and browser evidence separately in `notes/build-validation-v2.json` and the v2 addition to `design-qa.md`; passing automated tests alone does not confirm rendered scenery, audio output or browser controls. Preserve asset licenses, the saved 018 release, and the local-preview / not-publicly-published status.

At this v2 revision, all 43 automated scene checks pass, including the added wet-ground detail and smoke lifecycle checks. The 25 scene checks recorded for v1 remain historical evidence; keep these revision counts distinct when reporting validation.

## Publication scope — 2026-10-09

The user explicitly requested the complete shared understanding as a deployed webpage and a remote commit. Keep the existing 019 live scene root, provide understanding.html as the full reading and entry page, and use our recorded camp effect as the guide. Make the live scene, immutable 018 baseline, actual effect captures, controls, preservation downloads, sources and limitations obvious. Separate the 2026-10-03 experiments from new publication-day verification. Publish only the reviewed scene resources, selected real captures, and the unchanged baseline ZIP/manifest, preserving licenses. Work from current remote main and retain unrelated published projects and their CI checks.
