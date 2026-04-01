/**
 * RenderBridge – translates simulation state into Babylon scene updates.
 *
 * This is the critical boundary between the sim engine and the 3D renderer.
 *
 * Every frame the game loop:
 *   1. Reads the latest SimulationState
 *   2. Calls `bridge.sync(simState)` which moves meshes to match
 *
 * The bridge does NOT run simulation logic. It only reads and renders.
 *
 * Coordinate mapping:
 *   Sim uses CourtPosition { x, y }  (2D top-down, feet)
 *   Babylon uses Vector3     { x, y, z }
 *     x → sim.x   (along court length)
 *     y → height above floor
 *     z → sim.y   (along court width)
 */

import { Scene, Mesh, Vector3 } from "@babylonjs/core";
import type { SimulationState, Team } from "../types";
import {
  createPlayerMesh,
  createBallMesh,
  type PlayerEntity,
} from "../entities/EntityFactory";

export class RenderBridge {
  private scene: Scene;
  private playerEntities: Map<string, PlayerEntity> = new Map();
  private ballMesh: Mesh | null = null;
  private initialized = false;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Initialise visual entities to match the starting roster.
   * Call once when the game starts and the sim state is first available.
   */
  init(state: SimulationState, homeTeam: Team, awayTeam: Team): void {
    // Clean up any prior entities
    this.dispose();

    for (const sp of state.players) {
      const team = sp.teamId === homeTeam.id ? homeTeam : awayTeam;
      const mesh = createPlayerMesh(
        this.scene,
        sp.id,
        team.primaryColor
      );
      this.playerEntities.set(sp.id, { id: sp.id, teamId: sp.teamId, mesh });
    }

    this.ballMesh = createBallMesh(this.scene);
    this.initialized = true;

    // Immediately sync positions
    this.sync(state);
  }

  /**
   * Sync all visual entities to the latest simulation snapshot.
   * Called every frame from the render loop.
   */
  sync(state: SimulationState): void {
    if (!this.initialized) return;

    // Players
    for (const sp of state.players) {
      const entity = this.playerEntities.get(sp.id);
      if (!entity) continue;
      // Smooth interpolation toward target position
      const target = new Vector3(sp.position.x, 2, sp.position.y);
      entity.mesh.position = Vector3.Lerp(entity.mesh.position, target, 0.25);
    }

    // Ball
    if (this.ballMesh) {
      const bTarget = new Vector3(
        state.ballPosition.x,
        state.ballHeight,
        state.ballPosition.y
      );
      this.ballMesh.position = Vector3.Lerp(this.ballMesh.position, bTarget, 0.3);
    }
  }

  /** Clean up all created meshes. */
  dispose(): void {
    for (const [, entity] of this.playerEntities) {
      entity.mesh.dispose();
    }
    this.playerEntities.clear();
    this.ballMesh?.dispose();
    this.ballMesh = null;
    this.initialized = false;
  }
}
