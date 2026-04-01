/**
 * Entity Factory – creates and manages Babylon meshes for players and the ball.
 *
 * These are purely visual representations. The simulation engine owns the
 * authoritative positions; the RenderBridge reads sim state and tells
 * these entities where to be.
 */

import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
} from "@babylonjs/core";

/** A renderable player entity. */
export interface PlayerEntity {
  id: string;
  teamId: string;
  /** The capsule (or placeholder) mesh. */
  mesh: Mesh;
  /** Optional label billboard — to be added later. */
}

/** Create a capsule-shaped player mesh with team colour. */
export function createPlayerMesh(
  scene: Scene,
  id: string,
  teamColor: string
): Mesh {
  // Capsule = cylinder + two hemispheres. For now just a cylinder.
  const mesh = MeshBuilder.CreateCylinder(
    `player_${id}`,
    { height: 4, diameter: 1.6, tessellation: 12 },
    scene
  );
  mesh.position = new Vector3(0, 2, 0); // stand on ground

  const mat = new StandardMaterial(`pmat_${id}`, scene);
  mat.diffuseColor = Color3.FromHexString(teamColor);
  mat.specularColor = new Color3(0.2, 0.2, 0.2);
  mesh.material = mat;

  return mesh;
}

/** Create the basketball mesh. */
export function createBallMesh(scene: Scene): Mesh {
  const ball = MeshBuilder.CreateSphere("ball", { diameter: 0.9, segments: 12 }, scene);
  ball.position = new Vector3(0, 3.5, 0);

  const mat = new StandardMaterial("ballMat", scene);
  mat.diffuseColor = new Color3(0.85, 0.45, 0.1); // orange
  mat.specularColor = new Color3(0.3, 0.3, 0.3);
  ball.material = mat;

  return ball;
}
