# 灯市译语 / LANTERN LEXICON engine contract

`web/direction-language-engine.js` is a DOM-independent finite game. Its public metadata contains six signs, eight candidate meanings, three scenes, twelve observational records, and three requests. Correct sign interpretations and response checks remain internal to the engine. The UI renders `status(world)` and submits user choices through `act`; it must not derive a meaning from a sign ID or call the demonstration planner to fill a human player's choices.

`fresh()` returns a paused world in the `exploring` phase at `market`. `act(world, action)` returns a boolean and records every accepted action, including failed validation, wrong replies, revisits, and pause actions. Unknown actions, malformed payloads, extra fields, locked travel, paused gameplay, capped history, and all actions after completion return `false` without changing state.

Actions are exact objects:

- `{ type: 'pause', paused: boolean }`
- `{ type: 'visit', scene: 'market' | 'harbor' | 'lighthouse' }`
- `{ type: 'observe', id: evidenceId }`
- `{ type: 'guess', glyph: glyphId, meaning: meaningId }`
- `{ type: 'validate', glyph: glyphId }`
- `{ type: 'respond', answer: optionId }`
- `{ type: 'finish' }`

`status()` exposes `scene`, `unlockedScenes`, `phase`, `paused`, `observed` evidence objects, `currentEvidence` object or `null`, `glyphs`, the current `quest`, `solved`, `score`, `counts`, `stats`, `message`, the last 24 `log` entries, `lastResult`, `canFinish`, and a string `summary`. Each sign view has `id`, `mark`, `label` (`null` until confirmed), `guess` (a selected meaning ID or `null`), `candidates`, `evidenceCount`, `evidenceIds`, and `confirmed`. All views are detached copies. `quest.options` is an array of `{ id, label }`; `quest.canRespond` includes pause and completion guards. `lastResult.success` reports accepted validation/reply outcomes; `lastResult.reason` gives feedback without disclosing a correct answer on failure.

Validation needs a selected hypothesis and at least two distinct, actually observed contexts containing that sign. Insufficient evidence is an accepted unsuccessful validation with the same feedback for correct and wrong hypotheses; it increments `validations`, but not `wrongVerifications`. Adequately evidenced wrong hypotheses increment `wrongVerifications` and stay editable. Confirmed interpretations cannot be replaced by a false candidate. An observation can be reread from another scene once it has been discovered; rereading selects it without changing the current response scene or awarding points.

Market requires confirmed `person`, `give`, `lamp` plus `m-gift`; success unlocks harbor. Harbor requires confirmed `open`, `water`, `door` plus `h-sign` and `h-open`; success unlocks lighthouse. Lighthouse requires all six signs confirmed plus `l-request`. Successful replies retain the current scene. Finishing requires all six confirmed and all three requests solved, then explicitly sets `phase: 'complete'` and `paused: true`.

Only a new observation awards 10 points, a first confirmation 20, and a first solved request 30. The ordinary full discovery route has 12 observations, 6 confirmations, and 3 requests: **330 points**. Skipping optional observations can produce a legally completed game with fewer points.

`serialize(world)` returns only `{ version, actions }` as JSON. `deserialize(raw)` rejects malformed Unicode, oversized UTF8, unknown versions, extra fields, malformed actions, illegal history, and more than 2048 accepted actions; it reconstructs the world by applying the same production rules and always restores paused. No discoveries, dictionary flags, score, world, or objective may be injected in a save. The 200000-byte save cap exceeds all accepted histories at the action cap. Fresh worlds are registered internally; copied or externally modified worlds cannot be used to inject progress.

`demoPlanner(world)` returns one next legal action or `null`. It includes unpausing, actual observations, editable guesses, explicit validation, scene replies, explicit visits, and explicit finish. It repairs partial manual work through the same API and never returns a solved world.

Run `tooling/check-direction-language-rules.mjs` using the bundled Node runtime. Its generated report is `notes/direction-language-rules-20261006.json`; `count` is the number of passed behavioral checks. The 54 passing checks include two distinct manual orders, honest wrong attempts, every ordinary-demo intermediate replay, proof for all six signs, isolation, pause barriers, terminal guards, and save bounds.
