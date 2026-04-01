# Court Models

Place court GLB files here.

## Expected files

- `court_generic.glb` — base court floor + markings as a 3D model
- `court_home.glb`    — branded home court (center logo, team colors)

## Notes

The current implementation uses procedurally generated court geometry.
A GLB court can replace the procedural floor by swapping the `buildFloor()`
call in `CourtScene.ts`.
