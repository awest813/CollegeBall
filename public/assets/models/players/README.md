# Player Models

Place player GLB files here.

## Expected files

- `player_base.glb` — shared base body mesh (~3,000 triangles)
  - Used by all players; team colors applied via material overrides
  - Should include a single armature compatible with the animation clips

## Naming convention

- `player_base.glb` — default humanoid, no accessories
- `player_base_tall.glb` — tall body variant (C/PF)
- `player_base_guard.glb` — shorter/leaner variant (PG/SG)

## Integration

When a model is ready, update `PlayerVisual.ts` `createPlayerVisual()` to use
`SceneLoader.ImportMeshAsync("/assets/models/players/player_base.glb", ...)`.
The primitive fallback remains in place if the file is missing.
