# 🏀 CollegeBall

**College Basketball Coaching Simulator** — a sim-first, 3D-rendered basketball engine built with React, Babylon.js, TypeScript, and Tailwind CSS.

---

## What It Is

CollegeBall simulates a full 40-minute college basketball game entirely in the browser. A pure simulation engine drives all the action — player movement, shot selection, passing, steals, rebounds, fouls, and free throws — while a Babylon.js render layer visualises everything on a 3D court with a broadcast-style camera.

This is a **coaching simulator**, not a twitch game. You watch the game unfold, control speed, switch camera angles, and track live stats. Future phases will add substitutions, play-calling, recruiting, and season / tournament modes.

---

## Getting Started

```bash
npm install
npm run dev        # development server
npm run build      # production build (outputs to /dist)
npm run lint       # ESLint check
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 + TypeScript |
| 3D Engine | Babylon.js 6 |
| State Management | Zustand |
| Styling | Tailwind CSS |
| Bundler | Vite |

---

## Project Architecture

CollegeBall uses a **sim-first** design: the simulation engine is completely framework-agnostic and the rendering / UI layers only consume its output.

```
src/
├── game/
│   ├── sim/engine.ts          # Pure simulation engine (no Babylon, no React)
│   ├── rendering/
│   │   ├── RenderBridge.ts    # Bridges sim state → Babylon meshes
│   │   ├── PlayerVisual.ts    # 3D player meshes (procedural + GLB-ready)
│   │   ├── AnimationStateMachine.ts  # 11-state animation FSM
│   │   └── BroadcastCamera.ts # TV-style ball-tracking camera
│   ├── scenes/
│   │   ├── CourtScene.ts      # 3D court geometry
│   │   └── ArenaLighting.ts   # Key / fill / rim lights
│   ├── core/court.ts          # Court constants and geometry helpers
│   ├── data/defaults.ts       # Default teams and game settings
│   ├── entities/EntityFactory.ts
│   └── types/index.ts         # Shared, framework-agnostic types
├── store/gameStore.ts         # Zustand store (UI ↔ sim boundary)
├── hooks/useSimLoop.ts        # RAF-based game loop
├── screens/
│   ├── MainMenu.tsx           # Landing screen with matchup preview
│   └── GameScreen.tsx         # In-game view with HUD
└── ui/
    ├── Scoreboard.tsx         # Live score / clocks / team fouls HUD
    ├── GameControls.tsx       # Play / pause / speed / camera controls
    ├── EventFeed.tsx          # Real-time game-event ticker
    └── PostGameOverlay.tsx    # Final score + player box score
```

**Coordinate system:** court is 94 × 50 ft centred at origin (`x` = sideline, `y` = baseline). Home basket at `x = −43`, away basket at `x = 43`. Sim uses 2D court coordinates; the render bridge maps these to Babylon's 3D world space.

---

## Simulation Engine

The engine (`src/game/sim/engine.ts`) runs as a pure `tick(state, dt) → state` function:

- **5v5 positioning** — OFFENSE_SLOTS / DEFENSE_SLOTS with per-tick jitter; man-to-man defense
- **Ball-handler AI** — drives toward the basket, decides pass vs. shoot based on distance + ratings
- **Shot resolution** — distance-adjusted make probability (layup bonus, deep-3 penalty), defensive contest reduction
- **Shooting fouls** — contested shots in close range can draw fouls; foul-out at 5 personal fouls
- **Free throws** — instant resolution based on shooter's FT rating (derived from shooting rating)
- **Rebound contest** — proximity + rebounding rating weighted; offensive / defensive rebound branch
- **Steal chance** — defender proximity to passing lane, defense vs. passing rating duel
- **Clocks** — game clock (2 × 20-min halves), shot clock (30 s), half-time possession swap, team fouls reset per half
- **Player statistics** — points, FG/FT attempts & makes, 3-pointers, rebounds, steals, fouls (per game)

Player ratings: `speed`, `shooting`, `passing`, `defense`, `rebounding` (all 0–100).

---

## Development Phases

### ✅ Phase 1 — Simulation Foundation
Pure basketball sim engine, game clock / shot clock, possession system, shot/pass/rebound/steal logic, Zustand store, React scaffolding.

### ✅ Phase 2 — 3D Rendering & Visual Polish
Babylon.js court scene, arena lighting, 3-part procedural player meshes with DynamicTexture jersey numbers, 11-state animation FSM with blend-in cross-fades, GLB model loading infrastructure, broadcast camera (3 modes: broadcast / overhead / endzone), polished main menu and in-game HUD.

### 🚧 Phase 3 — Game Depth (current)
Shooting fouls, free throw simulation, team foul tracking (bonus FT rules), personal foul-out at 5 fouls, per-game player statistics (points, FG, FT, 3PM, rebounds, steals, fouls), live fouls display on the scoreboard, end-of-game box score in the post-game overlay.

### 🔮 Future
- Non-shooting / bonus foul system
- Player substitutions & fatigue / stamina
- Play calling & coaching decisions (Playbook)
- Season mode with standings and schedules
- Tournament bracket
- Player recruiting and roster management
- Actual GLB player models with animation clips
- Sound design (crowd, whistle, announcer)

---

## Assets

Player models are expected at `public/assets/models/players/player_base.glb`. Until that asset is provided, the renderer falls back to procedural primitives (capsule body, cylinder legs, sphere head) with team-coloured materials and DynamicTexture jersey numbers.

---

## Contributing

Pull requests welcome. Please run `npm run lint` and `npm run build` before submitting.