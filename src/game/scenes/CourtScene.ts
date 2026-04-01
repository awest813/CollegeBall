/**
 * CourtScene – builds the basketball-court Babylon scene geometry.
 *
 * Sets up:
 *   • Polished hardwood floor with specular reflection
 *   • Full court markings (boundaries, half-court, three-point arcs,
 *     key, free-throw circles, restricted area arcs, centre circle)
 *   • Centre-court logo placeholder disc
 *   • Full basket assemblies (stanchion, arm, backboard, rim, net)
 *   • Bench zone placeholders on each sideline
 *   • Scorer's table placeholder at half-court
 *   • Arena lighting via ArenaLighting helpers
 *
 * The camera is NOT created here — it is owned by the RenderBridge's
 * BroadcastCamera so it can update each frame to track the ball.
 *
 * This file is a pure scene-geometry builder.  It does not import React
 * and does not manage game state.
 */

import {
  Scene,
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
  BASKET_X_HOME,
  BASKET_X_AWAY,
} from "../core/court";

import { setupArenaLighting } from "./ArenaLighting";

// ---------------------------------------------------------------------------
// Court geometry constants (NCAA men's dimensions, in feet)
// ---------------------------------------------------------------------------

const LINE_Y = 0.012; // y-height of painted lines above floor
const KEY_WIDTH = 12; // ft — lane width
const KEY_DEPTH = 19; // ft — free-throw line distance
const FREE_THROW_CIRCLE_R = 6; // ft
const CENTRE_CIRCLE_R = 6; // ft
const RESTRICTED_AREA_R = 4; // ft (semi-circle under basket)

/**
 * NCAA men's corner three-point sideline distance (ft).
 * The three-point line runs straight for ~21.65 ft from the baseline before
 * curving into the 22.15 ft arc radius.  This is the z-value at which the
 * arc begins (i.e. the inbound end of the corner three-point stripe).
 */
const CORNER_THREE_Z = 21.65;

// Basket height (10 ft from floor, per regulation)
const RIM_HEIGHT = 10;
// Backboard sits 4 ft inside the baseline, 13 ft above floor (top)
const BACKBOARD_X_OFFSET = 4; // distance inward from baseline

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Set up the static court environment.
 * Returns the court floor mesh so the caller can register it for shadows.
 */
export function setupCourtScene(scene: Scene): { floorMesh: Mesh } {
  // Background — dark arena black
  scene.clearColor = new Color4(0.05, 0.05, 0.08, 1);

  // Arena lighting (no shadows in default path for performance)
  setupArenaLighting(scene, false);

  // Floor
  const floorMesh = buildFloor(scene);

  // Court markings
  buildCourtMarkings(scene);

  // Centre logo placeholder
  buildCentreLogoDisc(scene);

  // Basket assemblies (home = left, away = right)
  buildBasketAssembly(scene, BASKET_X_HOME, 1);  // facing right (+x)
  buildBasketAssembly(scene, BASKET_X_AWAY, -1); // facing left  (-x)

  // Bench zones and scorer's table
  buildSidelineFurniture(scene);

  return { floorMesh };
}

// ---------------------------------------------------------------------------
// Floor
// ---------------------------------------------------------------------------

function buildFloor(scene: Scene): Mesh {
  const floor = MeshBuilder.CreateGround(
    "courtFloor",
    { width: COURT_LENGTH, height: COURT_WIDTH, subdivisions: 1 },
    scene
  );

  const mat = new StandardMaterial("courtFloorMat", scene);
  mat.diffuseColor = new Color3(0.74, 0.58, 0.38); // warm maple hardwood
  mat.specularColor = new Color3(0.22, 0.20, 0.16); // polished gloss
  mat.specularPower = 48;
  floor.material = mat;

  return floor;
}

// ---------------------------------------------------------------------------
// Court markings
// ---------------------------------------------------------------------------

function buildCourtMarkings(scene: Scene): void {
  const lineColor = new Color3(1, 1, 1);

  // Boundary
  line(scene, lineColor, [
    new Vector3(-HALF_LENGTH, LINE_Y, -HALF_WIDTH),
    new Vector3(HALF_LENGTH, LINE_Y, -HALF_WIDTH),
    new Vector3(HALF_LENGTH, LINE_Y, HALF_WIDTH),
    new Vector3(-HALF_LENGTH, LINE_Y, HALF_WIDTH),
    new Vector3(-HALF_LENGTH, LINE_Y, -HALF_WIDTH),
  ]);

  // Half-court line
  line(scene, lineColor, [
    new Vector3(0, LINE_Y, -HALF_WIDTH),
    new Vector3(0, LINE_Y, HALF_WIDTH),
  ]);

  // Centre circle
  circle(scene, lineColor, Vector3.Zero(), CENTRE_CIRCLE_R, LINE_Y, 48);

  // Three-point arcs — home (left) and away (right)
  // NCAA: corner 3 begins at 22 ft from basket, arc extends from there
  const homePivot = new Vector3(BASKET_X_HOME, LINE_Y, 0);
  const awayPivot = new Vector3(BASKET_X_AWAY, LINE_Y, 0);

  // Straight corner segments for 3-point line
  const cornerX_home = -HALF_LENGTH + 3.0;
  const cornerX_away = HALF_LENGTH - 3.0;

  // Home side corners
  line(scene, lineColor, [
    new Vector3(-HALF_LENGTH, LINE_Y, -CORNER_THREE_Z),
    new Vector3(cornerX_home, LINE_Y, -CORNER_THREE_Z),
  ]);
  line(scene, lineColor, [
    new Vector3(-HALF_LENGTH, LINE_Y, CORNER_THREE_Z),
    new Vector3(cornerX_home, LINE_Y, CORNER_THREE_Z),
  ]);
  arc(scene, lineColor, homePivot, THREE_POINT_RADIUS, -Math.PI / 2, Math.PI / 2, 48);

  // Away side corners
  line(scene, lineColor, [
    new Vector3(HALF_LENGTH, LINE_Y, -CORNER_THREE_Z),
    new Vector3(cornerX_away, LINE_Y, -CORNER_THREE_Z),
  ]);
  line(scene, lineColor, [
    new Vector3(HALF_LENGTH, LINE_Y, CORNER_THREE_Z),
    new Vector3(cornerX_away, LINE_Y, CORNER_THREE_Z),
  ]);
  arc(scene, lineColor, awayPivot, THREE_POINT_RADIUS, Math.PI / 2, (3 * Math.PI) / 2, 48);

  // Keys (lane boxes)
  buildKey(scene, lineColor, -HALF_LENGTH, 1);   // home
  buildKey(scene, lineColor, HALF_LENGTH, -1);    // away

  // Free-throw circles
  circle(scene, lineColor, new Vector3(-HALF_LENGTH + KEY_DEPTH, LINE_Y, 0), FREE_THROW_CIRCLE_R, LINE_Y, 48);
  circle(scene, lineColor, new Vector3(HALF_LENGTH - KEY_DEPTH, LINE_Y, 0), FREE_THROW_CIRCLE_R, LINE_Y, 48);

  // Restricted area arcs (4 ft radius under each basket)
  arc(scene, lineColor, new Vector3(BASKET_X_HOME, LINE_Y, 0), RESTRICTED_AREA_R, -Math.PI / 2, Math.PI / 2, 24);
  arc(scene, lineColor, new Vector3(BASKET_X_AWAY, LINE_Y, 0), RESTRICTED_AREA_R, Math.PI / 2, (3 * Math.PI) / 2, 24);
}

/** Draw the key (lane box) for one end of the court. */
function buildKey(
  scene: Scene,
  color: Color3,
  baselineX: number,
  direction: 1 | -1
): void {
  const hw = KEY_WIDTH / 2;
  const ftLine = baselineX + direction * KEY_DEPTH;

  // Lane sides
  line(scene, color, [
    new Vector3(baselineX, LINE_Y, -hw),
    new Vector3(ftLine, LINE_Y, -hw),
  ]);
  line(scene, color, [
    new Vector3(baselineX, LINE_Y, hw),
    new Vector3(ftLine, LINE_Y, hw),
  ]);
  // Free-throw line
  line(scene, color, [
    new Vector3(ftLine, LINE_Y, -hw),
    new Vector3(ftLine, LINE_Y, hw),
  ]);
}

// ---------------------------------------------------------------------------
// Centre logo placeholder
// ---------------------------------------------------------------------------

function buildCentreLogoDisc(scene: Scene): void {
  const disc = MeshBuilder.CreateDisc(
    "centreLogo",
    { radius: CENTRE_CIRCLE_R - 0.4, tessellation: 48 },
    scene
  );
  disc.rotation.x = Math.PI / 2;
  disc.position = new Vector3(0, 0.008, 0);

  const mat = new StandardMaterial("centreLogoMat", scene);
  mat.diffuseColor = new Color3(0.68, 0.52, 0.32); // slightly darker inlay
  mat.specularColor = new Color3(0.15, 0.13, 0.10);
  mat.specularPower = 32;
  disc.material = mat;
}

// ---------------------------------------------------------------------------
// Basket assembly
// ---------------------------------------------------------------------------

/**
 * Create a full basket assembly at the given X position.
 * @param direction  +1 = home basket (stanchion behind, arm extends right),
 *                  -1 = away basket.
 */
function buildBasketAssembly(
  scene: Scene,
  basketX: number,
  direction: 1 | -1
): void {
  const tag = direction === 1 ? "home" : "away";

  // Stanchion base (on the baseline, behind the basket)
  const baseX = basketX - direction * 2.5; // stanchion base behind baseline

  const stanchionMat = createMat(scene, `stanchion_${tag}`, new Color3(0.25, 0.25, 0.28));
  const boardMat = createMat(
    scene, `board_${tag}`,
    new Color3(0.88, 0.92, 0.96),
    new Color3(0.4, 0.4, 0.4),
    64
  );
  const rimMat = createMat(scene, `rim_${tag}`, new Color3(1.0, 0.4, 0.1), new Color3(0.5, 0.25, 0.05), 80);
  const netMat = createMat(scene, `net_${tag}`, new Color3(0.95, 0.95, 0.95));
  netMat.wireframe = true;

  // --- Stanchion pole ---
  const pole = MeshBuilder.CreateCylinder(`pole_${tag}`, { height: 13, diameter: 0.35, tessellation: 8 }, scene);
  pole.position = new Vector3(baseX, 6.5, 0);
  pole.material = stanchionMat;

  // --- Horizontal arm (from top of pole to backboard) ---
  const armLength = Math.abs(basketX + BACKBOARD_X_OFFSET * direction - baseX);
  const arm = MeshBuilder.CreateBox(`arm_${tag}`, { width: armLength, height: 0.3, depth: 0.3 }, scene);
  arm.position = new Vector3(
    (baseX + basketX + BACKBOARD_X_OFFSET * direction) / 2,
    13,
    0
  );
  arm.material = stanchionMat;

  // --- Backboard ---
  const board = MeshBuilder.CreateBox(
    `backboard_${tag}`,
    { width: 0.18, height: 3.5, depth: 5.8 },
    scene
  );
  board.position = new Vector3(basketX + BACKBOARD_X_OFFSET * direction, 11.75, 0);
  board.material = boardMat;

  // Inner rectangle on backboard (white target square)
  const inner = MeshBuilder.CreateBox(
    `bbInner_${tag}`,
    { width: 0.05, height: 1.5, depth: 2.2 },
    scene
  );
  inner.position = new Vector3(
    basketX + BACKBOARD_X_OFFSET * direction - direction * 0.12,
    RIM_HEIGHT + 0.3,
    0
  );
  const innerMat = createMat(scene, `bbInner_mat_${tag}`, new Color3(1, 1, 1));
  inner.material = innerMat;

  // --- Rim (torus) ---
  const rim = MeshBuilder.CreateTorus(
    `rim_${tag}`,
    { diameter: 1.52, thickness: 0.08, tessellation: 24 },
    scene
  );
  rim.position = new Vector3(basketX, RIM_HEIGHT, 0);
  rim.rotation.x = Math.PI / 2;
  rim.material = rimMat;

  // --- Net (tapered cylinder, wireframe) ---
  const net = MeshBuilder.CreateCylinder(
    `net_${tag}`,
    { height: 1.2, diameterTop: 1.44, diameterBottom: 0.8, tessellation: 12 },
    scene
  );
  net.position = new Vector3(basketX, RIM_HEIGHT - 0.65, 0);
  net.material = netMat;

  // --- Stanchion base plate ---
  const base = MeshBuilder.CreateBox(`base_${tag}`, { width: 2.0, height: 0.2, depth: 2.0 }, scene);
  base.position = new Vector3(baseX, 0.1, 0);
  base.material = stanchionMat;
}

// ---------------------------------------------------------------------------
// Sideline furniture
// ---------------------------------------------------------------------------

function buildSidelineFurniture(scene: Scene): void {
  const benchMat = createMat(scene, "benchMat", new Color3(0.22, 0.22, 0.24));
  const tableMat = createMat(scene, "tableMat", new Color3(0.30, 0.28, 0.26));

  const benchZ = HALF_WIDTH + 2.5; // just outside the sideline
  const benchLength = 18;
  const benchHeight = 0.5;

  // Home bench (left side, +Z sideline)
  const homeBench = MeshBuilder.CreateBox("homeBench", {
    width: benchLength, height: benchHeight, depth: 2.0,
  }, scene);
  homeBench.position = new Vector3(-12, benchHeight / 2, benchZ);
  homeBench.material = benchMat;

  // Away bench (left side, -Z sideline)
  const awayBench = MeshBuilder.CreateBox("awayBench", {
    width: benchLength, height: benchHeight, depth: 2.0,
  }, scene);
  awayBench.position = new Vector3(12, benchHeight / 2, -benchZ);
  awayBench.material = benchMat;

  // Scorer's table (at half-court, +Z sideline)
  const table = MeshBuilder.CreateBox("scorersTable", {
    width: 12, height: 0.9, depth: 1.5,
  }, scene);
  table.position = new Vector3(0, 0.45, benchZ);
  table.material = tableMat;
}

// ---------------------------------------------------------------------------
// Primitive drawing helpers
// ---------------------------------------------------------------------------

function line(scene: Scene, color: Color3, points: Vector3[]): void {
  const ln = MeshBuilder.CreateLines(`ln_${Math.random().toString(36).slice(2)}`, { points }, scene);
  ln.color = color;
}

function circle(
  scene: Scene,
  color: Color3,
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
  line(scene, color, pts);
}

function arc(
  scene: Scene,
  color: Color3,
  centre: Vector3,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments = 32
): void {
  const pts: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + (i / segments) * (endAngle - startAngle);
    pts.push(new Vector3(
      centre.x + Math.cos(a) * radius,
      centre.y,
      centre.z + Math.sin(a) * radius
    ));
  }
  line(scene, color, pts);
}

function createMat(
  scene: Scene,
  name: string,
  diffuse: Color3,
  specular = new Color3(0.08, 0.08, 0.08),
  specularPower = 16
): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = diffuse;
  mat.specularColor = specular;
  mat.specularPower = specularPower;
  return mat;
}
