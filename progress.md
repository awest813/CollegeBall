Original prompt: debug, audit, polish and test simulated gameplay

- 2026-04-01: Loaded the `develop-web-game` workflow and inspected the current Vite/Babylon/React simulation stack.
- 2026-04-01: Found that automated gameplay validation is currently missing the required `window.render_game_to_text` and deterministic `window.advanceTime(ms)` hooks.
- 2026-04-01: Added a deterministic sim stepping path in `useSimLoop`, installed `window.render_game_to_text`, `window.advanceTime(ms)`, and fullscreen hooks from `GameScreen`.
- 2026-04-01: Normalized simulation-side team ownership to `home`/`away` so gameplay logic no longer depends on raw team ids. Added a regression test covering custom team ids.
- 2026-04-01: Reworked the event feed to read actual sim events from the store instead of inferring turnovers/rebounds from score diffs.
- 2026-04-01: Fixed browser-test blockers by preventing Babylon from rendering before a camera exists, explicitly activating the broadcast camera, and disabling missing GLB upgrade requests that were producing 404 noise.
- 2026-04-01: Verified `npm test` and `npm run build` both pass after the changes.
- 2026-04-01: Verified a Playwright gameplay loop against `vite preview` using deterministic frame stepping. Captured screenshots plus text states in `output/web-game/`; observed a clean run with live scoring (for example `2-2` by `state-0.json`, `4-2` by `state-3.json`) and no runtime error artifacts on the final run.
- 2026-04-01: Remaining note: the browser harness itself still emits a Node warning about the shared skill script lacking `"type": "module"` in its external package metadata, but that warning did not affect gameplay validation.
