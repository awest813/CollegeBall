/**
 * RenderBridge – translates simulation state into Babylon scene updates.
 *
 * This is the critical boundary between the sim engine and the 3D renderer.
 *
 * Every frame the game loop:
 *   1. Reads the latest SimulationState
 *   2. Calls `bridge.sync(simState, dt)` which moves entities to match
 *
 * The bridge does NOT run simulation logic. It only reads and renders.
 *
 * Coordinate mapping:
 *   Sim uses CourtPosition { x, y }  (2D top-down, feet)
 *   Babylon uses Vector3     { x, y, z }
 *     sim.x → Babylon x   (along court length)
 *     sim.y → Babylon z   (along court width)
 *     y     → height above floor
 *
 * Systems owned here:
 *   • PlayerVisual entities (humanoid primitives / future GLB)
 *   • Per-player AnimationState tracking
 *   • Ball mesh
 *   • BroadcastCamera (tracks ball each frame)
 */

import { Scene, Mesh, Vector3, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";
import type { SimulationState, Team, CameraMode } from "../types";
import {
  createPlayerVisual,
  updatePlayerVisual,
  disposePlayerVisual,
  clearPlayerMaterialCache,
  type PlayerVisualEntity,
} from "./PlayerVisual";
import {
  makeIdleAnimState,
  resolveAnimationState,
  tickAnimationState,
  type AnimationState,
  type PlayerAnimContext,
} from "./AnimationStateMachine";
import { BroadcastCamera } from "./BroadcastCamera";

/** Minimum dt in seconds before speed calculation is meaningful. */
const MIN_DELTA_TIME = 0.0001;

export class RenderBridge {
  private scene: Scene;
  private playerVisuals: Map<string, PlayerVisualEntity> = new Map();
  private animStates: Map<string, AnimationState> = new Map();
  private facingAngles: Map<string, number> = new Map();
  private prevPositions: Map<string, { x: number; z: number }> = new Map();
  private ballMesh: Mesh | null = null;
  private broadcastCamera: BroadcastCamera | null = null;
  private initialized = false;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Initialise visual entities to match the starting roster.
   * Also creates the BroadcastCamera that tracks the ball.
   * Call once when the game starts and the sim state is first available.
   */
  init(state: SimulationState, homeTeam: Team, awayTeam: Team): void {
    this.dispose();
    clearPlayerMaterialCache();

    const allPlayers = [...homeTeam.roster, ...awayTeam.roster];

    for (const sp of state.players) {
      const team = sp.teamId === homeTeam.id ? homeTeam : awayTeam;
      const isHome = sp.teamId === homeTeam.id;
      const playerData = allPlayers.find((p) => p.id === sp.id);
      const number = playerData?.number ?? 0;

      const visual = createPlayerVisual(this.scene, {
        id: sp.id,
        team,
        isHome,
        number,
      });

      this.playerVisuals.set(sp.id, visual);
      this.animStates.set(sp.id, makeIdleAnimState());
      this.facingAngles.set(sp.id, 0);
      this.prevPositions.set(sp.id, {
        x: sp.position.x,
        z: sp.position.y,
      });
    }

    this.ballMesh = createBallMesh(this.scene);

    // Create broadcast camera (owns the camera for this scene)
    this.broadcastCamera = new BroadcastCamera(this.scene);

    this.initialized = true;
    this.sync(state, 0);
  }

  /**
   * Sync all visual entities to the latest simulation snapshot.
   * Called every frame from the render loop.
   *
   * @param state  Latest sim snapshot
   * @param dt     Frame delta time in seconds (used for animation ticking)
   */
  sync(state: SimulationState, dt: number): void {
    if (!this.initialized) return;

    for (const sp of state.players) {
      const visual = this.playerVisuals.get(sp.id);
      if (!visual) continue;

      const worldX = sp.position.x;
      const worldZ = sp.position.y; // sim Y → Babylon Z

      // Compute movement speed from position delta
      const prev = this.prevPositions.get(sp.id) ?? { x: worldX, z: worldZ };
      const dx = worldX - prev.x;
      const dz = worldZ - prev.z;
      const speed = dt > MIN_DELTA_TIME ? Math.sqrt(dx * dx + dz * dz) / dt : 0;

      // Update facing angle from movement direction
      if (Math.abs(dx) > 0.02 || Math.abs(dz) > 0.02) {
        this.facingAngles.set(sp.id, Math.atan2(dz, dx));
      }
      this.prevPositions.set(sp.id, { x: worldX, z: worldZ });

      // Tick animation state
      const isDefending = sp.teamId !== state.possession.team;
      const ctx: PlayerAnimContext = {
        simPlayer: sp,
        hasBall: sp.hasBall,
        isDefending,
        speed,
        shotInFlight: state.shotInFlight,
      };
      const current = this.animStates.get(sp.id) ?? makeIdleAnimState();
      const desired = resolveAnimationState(ctx, current);
      const next = tickAnimationState(current, desired, dt);
      this.animStates.set(sp.id, next);
      visual.animState = next;

      updatePlayerVisual(
        visual,
        worldX,
        worldZ,
        this.facingAngles.get(sp.id) ?? 0
      );
    }

    // Ball
    if (this.ballMesh) {
      const bTarget = new Vector3(
        state.ballPosition.x,
        state.ballHeight,
        state.ballPosition.y
      );
      this.ballMesh.position = Vector3.Lerp(this.ballMesh.position, bTarget, 0.35);
    }

    // Camera tracking
    if (this.broadcastCamera) {
      this.broadcastCamera.update(
        state.ballPosition.x,
        state.ballPosition.y
      );
    }
  }

  /** Switch the active camera perspective. Has no effect before init(). */
  setCameraMode(mode: CameraMode): void {
    this.broadcastCamera?.setMode(mode);
  }

  /** Clean up all created meshes and clear the material cache. */
  dispose(): void {
    for (const visual of this.playerVisuals.values()) {
      disposePlayerVisual(visual);
    }
    this.playerVisuals.clear();
    this.animStates.clear();
    this.facingAngles.clear();
    this.prevPositions.clear();

    this.ballMesh?.dispose();
    this.ballMesh = null;

    // Camera dispose handled by Babylon scene disposal
    this.broadcastCamera = null;
    this.initialized = false;
  }
}

// ---------------------------------------------------------------------------
// Ball mesh factory (kept here; no team association)
// ---------------------------------------------------------------------------

function createBallMesh(scene: Scene): Mesh {
  const ball = MeshBuilder.CreateSphere(
    "ball",
    { diameter: 0.90, segments: 10 },
    scene
  );
  ball.position = new Vector3(0, 3.5, 0);

  const mat = new StandardMaterial("ballMat", scene);
  mat.diffuseColor = new Color3(0.86, 0.46, 0.10); // NBA orange
  mat.specularColor = new Color3(0.35, 0.18, 0.05);
  mat.specularPower = 40;
  ball.material = mat;

  return ball;
}
