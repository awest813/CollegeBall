/**
 * CourtScene – builds the basketball-court Babylon scene.
 *
 * Creates:
 *   • A ground plane textured / coloured like a court
 *   • Court lines (half-court, three-point arcs, key, centre circle)
 *   • Lighting suitable for a broadcast camera angle
 *   • An ArcRotateCamera aimed at centre court
 *
 * The scene setup is a pure function of a Babylon `Scene` — it doesn't
 * import React and doesn't manage game state.
 */

import {
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  Mesh,
} from "@babylonjs/core";

import {
  COURT_LENGTH,
  COURT_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  THREE_POINT_RADIUS,
} from "../core/court";

/** Set up the static court environment. Returns nothing — meshes live on the scene. */
export function setupCourtScene(scene: Scene): void {
  // -- Background colour --
  scene.clearColor = new Color4(0.08, 0.08, 0.12, 1);

  // -- Camera --
  const camera = new ArcRotateCamera(
    "cam",
    -Math.PI / 2, // alpha — looking along +x from the side
    Math.PI / 3.2, // beta — slight top-down
    70, // radius
    new Vector3(0, 0, 0),
    scene
  );
  camera.lowerRadiusLimit = 30;
  camera.upperRadiusLimit = 120;
  camera.lowerBetaLimit = 0.3;
  camera.upperBetaLimit = Math.PI / 2.2;
  camera.attachControl(scene.getEngine().getRenderingCanvas(), true);

  // -- Lights --
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.6;

  const dir = new DirectionalLight("dir", new Vector3(-0.5, -1, 0.3), scene);
  dir.intensity = 0.7;

  // -- Court floor --
  const floor = MeshBuilder.CreateGround(
    "court",
    { width: COURT_LENGTH, height: COURT_WIDTH },
    scene
  );
  const floorMat = new StandardMaterial("courtMat", scene);
  floorMat.diffuseColor = new Color3(0.76, 0.6, 0.42); // hardwood
  floorMat.specularColor = new Color3(0.15, 0.15, 0.15);
  floor.material = floorMat;

  // -- Court boundaries (thin box outlines) --
  drawLine(scene, [
    new Vector3(-HALF_LENGTH, 0.01, -HALF_WIDTH),
    new Vector3(HALF_LENGTH, 0.01, -HALF_WIDTH),
    new Vector3(HALF_LENGTH, 0.01, HALF_WIDTH),
    new Vector3(-HALF_LENGTH, 0.01, HALF_WIDTH),
    new Vector3(-HALF_LENGTH, 0.01, -HALF_WIDTH),
  ]);

  // Half-court line
  drawLine(scene, [
    new Vector3(0, 0.01, -HALF_WIDTH),
    new Vector3(0, 0.01, HALF_WIDTH),
  ]);

  // Centre circle
  drawCircle(scene, Vector3.Zero(), 6, 0.01);

  // Three-point arcs (approximate with line segments)
  drawArc(scene, new Vector3(-HALF_LENGTH + 4, 0.01, 0), THREE_POINT_RADIUS, -Math.PI / 2, Math.PI / 2);
  drawArc(scene, new Vector3(HALF_LENGTH - 4, 0.01, 0), THREE_POINT_RADIUS, Math.PI / 2, (3 * Math.PI) / 2);

  // Keys (rectangles near each basket)
  const keyW = 12;
  const keyH = 19;
  drawLine(scene, [
    new Vector3(-HALF_LENGTH, 0.01, -keyW / 2),
    new Vector3(-HALF_LENGTH + keyH, 0.01, -keyW / 2),
    new Vector3(-HALF_LENGTH + keyH, 0.01, keyW / 2),
    new Vector3(-HALF_LENGTH, 0.01, keyW / 2),
  ]);
  drawLine(scene, [
    new Vector3(HALF_LENGTH, 0.01, -keyW / 2),
    new Vector3(HALF_LENGTH - keyH, 0.01, -keyW / 2),
    new Vector3(HALF_LENGTH - keyH, 0.01, keyW / 2),
    new Vector3(HALF_LENGTH, 0.01, keyW / 2),
  ]);

  // Backboards (thin boxes)
  createBackboard(scene, -HALF_LENGTH + 3);
  createBackboard(scene, HALF_LENGTH - 3);
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawLine(scene: Scene, points: Vector3[]): Mesh {
  const line = MeshBuilder.CreateLines("line", { points }, scene);
  line.color = new Color3(1, 1, 1);
  return line;
}

function drawCircle(
  scene: Scene,
  centre: Vector3,
  radius: number,
  y: number,
  segments = 48
): void {
  const pts: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new Vector3(centre.x + Math.cos(a) * radius, y, centre.z + Math.sin(a) * radius));
  }
  drawLine(scene, pts);
}

function drawArc(
  scene: Scene,
  centre: Vector3,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments = 32
): void {
  const pts: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + (i / segments) * (endAngle - startAngle);
    pts.push(new Vector3(centre.x + Math.cos(a) * radius, centre.y, centre.z + Math.sin(a) * radius));
  }
  drawLine(scene, pts);
}

function createBackboard(scene: Scene, x: number): void {
  const board = MeshBuilder.CreateBox("backboard", { width: 0.2, height: 3.5, depth: 6 }, scene);
  board.position = new Vector3(x, 4.5, 0);
  const mat = new StandardMaterial("bbMat", scene);
  mat.diffuseColor = new Color3(0.9, 0.9, 0.9);
  board.material = mat;
}
