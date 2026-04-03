/**
 * CourtScene – builds the basketball-court Babylon scene geometry.
 *
 * Sets up:
 *   • Polished hardwood floor with wood-grain DynamicTexture
 *   • Painted key (lane) areas with a contrasting fill colour
 *   • Full court markings (boundaries, half-court, three-point arcs,
 *     key, free-throw circles, restricted area arcs, centre circle)
 *   • Centre-court logo disc with concentric accent rings
 *   • Full basket assemblies (stanchion, arm, backboard, rim, net rings)
 *   • Shot-clock display boards above each basket
 *   • Arena seating banks behind each baseline and along both sidelines
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
  DynamicTexture,
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
  // Background — deep arena black
  scene.clearColor = new Color4(0.03, 0.03, 0.06, 1);

  // Arena lighting (shadows enabled for broadcast quality)
  setupArenaLighting(scene, true);

  // Floor with wood-grain texture
  const floorMesh = buildFloor(scene);

  // Painted key areas (filled colour rectangles)
  buildPaintedKeys(scene);

  // Court markings (lines on top of paint)
  buildCourtMarkings(scene);

  // Centre logo placeholder with accent rings
  buildCentreLogoDisc(scene);

  // Basket assemblies (home = left, away = right)
  buildBasketAssembly(scene, BASKET_X_HOME, 1);  // facing right (+x)
  buildBasketAssembly(scene, BASKET_X_AWAY, -1); // facing left  (-x)

  // Shot-clock display boards above each basket
  buildShotClockBoard(scene, BASKET_X_HOME, 1);
  buildShotClockBoard(scene, BASKET_X_AWAY, -1);

  // Arena seating banks
  buildArenaSeating(scene);

  // Bench zones and scorer's table
  buildSidelineFurniture(scene);

  return { floorMesh };
}

// ---------------------------------------------------------------------------
// Floor — hardwood with procedural wood-grain texture
// ---------------------------------------------------------------------------

function buildFloor(scene: Scene): Mesh {
  const floor = MeshBuilder.CreateGround(
    "courtFloor",
    { width: COURT_LENGTH, height: COURT_WIDTH, subdivisions: 1 },
    scene
  );

  const texSize = 1024;
  const tex = new DynamicTexture("woodGrainTex", { width: texSize, height: texSize }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Base maple colour
  ctx.fillStyle = "#c0935d";
  ctx.fillRect(0, 0, texSize, texSize);

  // Plank seams — vertical lines along the length of the court
  const PLANK_COUNT = 22;
  const plankW = texSize / PLANK_COUNT;
  ctx.strokeStyle = "rgba(100, 62, 20, 0.45)";
  ctx.lineWidth = 1.5;
  for (let i = 1; i < PLANK_COUNT; i++) {
    const x = i * plankW;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, texSize);
    ctx.stroke();
  }

  // Subtle grain streaks
  ctx.strokeStyle = "rgba(90, 55, 15, 0.18)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * texSize;
    const len = 60 + Math.random() * 120;
    const y = Math.random() * texSize;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + (Math.random() - 0.5) * 10, y + len * 0.33,
      x + (Math.random() - 0.5) * 10, y + len * 0.66,
      x + (Math.random() - 0.5) * 8, y + len
    );
    ctx.stroke();
  }

  // Lighter highlight stripe in each plank centre
  ctx.strokeStyle = "rgba(220, 175, 110, 0.22)";
  ctx.lineWidth = plankW * 0.32;
  for (let i = 0; i < PLANK_COUNT; i++) {
    const cx = (i + 0.5) * plankW;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, texSize);
    ctx.stroke();
  }

  tex.update();

  const mat = new StandardMaterial("courtFloorMat", scene);
  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.28, 0.24, 0.18); // polished gloss
  mat.specularPower = 64;
  floor.material = mat;

  return floor;
}

// ---------------------------------------------------------------------------
// Painted key (lane) areas
// ---------------------------------------------------------------------------

/**
 * Fill both key boxes with a coloured plane just above the floor.
 * College courts often use a school colour for the lane; here we use a
 * deep navy that reads well against the maple floor.
 */
function buildPaintedKeys(scene: Scene): void {
  const paintMat = new StandardMaterial("keyPaintMat", scene);
  paintMat.diffuseColor = new Color3(0.10, 0.18, 0.42); // deep navy
  paintMat.specularColor = new Color3(0.12, 0.12, 0.18);
  paintMat.specularPower = 32;

  // Home key (left end)
  const homeKey = MeshBuilder.CreateGround(
    "homeKeyPaint",
    { width: KEY_DEPTH, height: KEY_WIDTH },
    scene
  );
  homeKey.position = new Vector3(
    -HALF_LENGTH + KEY_DEPTH / 2,
    0.006, // just above floor, below line markers
    0
  );
  homeKey.material = paintMat;

  // Away key (right end)
  const awayKey = MeshBuilder.CreateGround(
    "awayKeyPaint",
    { width: KEY_DEPTH, height: KEY_WIDTH },
    scene
  );
  awayKey.position = new Vector3(
    HALF_LENGTH - KEY_DEPTH / 2,
    0.006,
    0
  );
  awayKey.material = paintMat;
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
  const homePivot = new Vector3(BASKET_X_HOME, LINE_Y, 0);
  const awayPivot = new Vector3(BASKET_X_AWAY, LINE_Y, 0);

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
// Centre logo placeholder with concentric accent rings
// ---------------------------------------------------------------------------

function buildCentreLogoDisc(scene: Scene): void {
  // Outer accent ring (gold)
  const outerRing = MeshBuilder.CreateDisc(
    "centreLogoOuter",
    { radius: CENTRE_CIRCLE_R - 0.25, tessellation: 48 },
    scene
  );
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position = new Vector3(0, 0.006, 0);
  const outerMat = new StandardMaterial("centreLogoOuterMat", scene);
  outerMat.diffuseColor = new Color3(0.72, 0.58, 0.22); // gold ring
  outerMat.specularColor = new Color3(0.3, 0.25, 0.08);
  outerMat.specularPower = 48;
  outerRing.material = outerMat;

  // Inner navy disc
  const disc = MeshBuilder.CreateDisc(
    "centreLogo",
    { radius: CENTRE_CIRCLE_R - 0.9, tessellation: 48 },
    scene
  );
  disc.rotation.x = Math.PI / 2;
  disc.position = new Vector3(0, 0.007, 0);
  const mat = new StandardMaterial("centreLogoMat", scene);
  mat.diffuseColor = new Color3(0.10, 0.16, 0.38); // navy inlay
  mat.specularColor = new Color3(0.10, 0.10, 0.16);
  mat.specularPower = 40;
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

  const baseX = basketX - direction * 2.5; // stanchion base behind baseline

  const stanchionMat = createMat(scene, `stanchion_${tag}`, new Color3(0.22, 0.22, 0.26), new Color3(0.15, 0.15, 0.15), 32);
  const boardMat = createMat(
    scene, `board_${tag}`,
    new Color3(0.88, 0.93, 0.97),
    new Color3(0.55, 0.55, 0.60),
    96
  );
  const rimMat = createMat(scene, `rim_${tag}`, new Color3(1.0, 0.38, 0.08), new Color3(0.6, 0.28, 0.04), 96);
  const netMat = createMat(scene, `net_${tag}`, new Color3(0.92, 0.92, 0.90), new Color3(0.05, 0.05, 0.05), 8);

  // --- Stanchion pole ---
  const pole = MeshBuilder.CreateCylinder(`pole_${tag}`, { height: 13, diameter: 0.3, tessellation: 10 }, scene);
  pole.position = new Vector3(baseX, 6.5, 0);
  pole.material = stanchionMat;

  // --- Horizontal arm ---
  const armLength = Math.abs(basketX + BACKBOARD_X_OFFSET * direction - baseX);
  const arm = MeshBuilder.CreateBox(`arm_${tag}`, { width: armLength, height: 0.25, depth: 0.25 }, scene);
  arm.position = new Vector3(
    (baseX + basketX + BACKBOARD_X_OFFSET * direction) / 2,
    13,
    0
  );
  arm.material = stanchionMat;

  // --- Backboard ---
  const board = MeshBuilder.CreateBox(
    `backboard_${tag}`,
    { width: 0.16, height: 3.5, depth: 5.8 },
    scene
  );
  board.position = new Vector3(basketX + BACKBOARD_X_OFFSET * direction, 11.75, 0);
  board.material = boardMat;

  // Inner target rectangle on backboard
  const inner = MeshBuilder.CreateBox(
    `bbInner_${tag}`,
    { width: 0.05, height: 1.5, depth: 2.2 },
    scene
  );
  inner.position = new Vector3(
    basketX + BACKBOARD_X_OFFSET * direction - direction * 0.10,
    RIM_HEIGHT + 0.3,
    0
  );
  const innerMat = createMat(scene, `bbInner_mat_${tag}`, new Color3(1, 1, 1), new Color3(0.3, 0.3, 0.3), 32);
  inner.material = innerMat;

  // --- Rim (torus) ---
  const rim = MeshBuilder.CreateTorus(
    `rim_${tag}`,
    { diameter: 1.52, thickness: 0.10, tessellation: 28 },
    scene
  );
  rim.position = new Vector3(basketX, RIM_HEIGHT, 0);
  rim.rotation.x = Math.PI / 2;
  rim.material = rimMat;

  // --- Net — stacked rings that taper inward (replaces wireframe cylinder) ---
  const NET_RINGS = 6;
  const netTopR = 0.70;
  const netBottomR = 0.36;
  const netTopY = RIM_HEIGHT - 0.10;
  const netBotY = RIM_HEIGHT - 1.15;
  for (let i = 0; i < NET_RINGS; i++) {
    const t = i / (NET_RINGS - 1);
    const ringR = netTopR + (netBottomR - netTopR) * t;
    const ringY = netTopY + (netBotY - netTopY) * t;
    const ring = MeshBuilder.CreateTorus(
      `net_ring_${tag}_${i}`,
      { diameter: ringR * 2, thickness: 0.045, tessellation: 14 },
      scene
    );
    ring.position = new Vector3(basketX, ringY, 0);
    ring.rotation.x = Math.PI / 2;
    ring.material = netMat;
  }

  // --- Stanchion base plate ---
  const base = MeshBuilder.CreateBox(`base_${tag}`, { width: 2.2, height: 0.18, depth: 2.2 }, scene);
  base.position = new Vector3(baseX, 0.09, 0);
  base.material = stanchionMat;
}

// ---------------------------------------------------------------------------
// Shot-clock display board above each basket
// ---------------------------------------------------------------------------

function buildShotClockBoard(scene: Scene, basketX: number, direction: 1 | -1): void {
  const tag = direction === 1 ? "home" : "away";

  const boardMat = new StandardMaterial(`shotClockBoardMat_${tag}`, scene);
  boardMat.diffuseColor = new Color3(0.08, 0.08, 0.10);
  boardMat.specularColor = new Color3(0.05, 0.05, 0.05);

  const screenMat = new StandardMaterial(`shotClockScreenMat_${tag}`, scene);
  screenMat.diffuseColor = new Color3(0.05, 0.22, 0.06); // dark green LED look
  screenMat.emissiveColor = new Color3(0.0, 0.08, 0.02);

  // Board housing
  const bx = basketX + BACKBOARD_X_OFFSET * direction;
  const board = MeshBuilder.CreateBox(`shotClockBoard_${tag}`, { width: 0.1, height: 1.0, depth: 2.6 }, scene);
  board.position = new Vector3(bx, 14.6, 0);
  board.material = boardMat;

  // LED screen face
  const screen = MeshBuilder.CreateBox(`shotClockScreen_${tag}`, { width: 0.08, height: 0.7, depth: 2.2 }, scene);
  screen.position = new Vector3(bx - direction * 0.05, 14.6, 0);
  screen.material = screenMat;
}

// ---------------------------------------------------------------------------
// Arena seating banks
// ---------------------------------------------------------------------------

/**
 * Simple tiered seating boxes behind each baseline and along both sidelines.
 * These create the arena silhouette visible in broadcast camera mode.
 */
function buildArenaSeating(scene: Scene): void {
  const seatDark = new StandardMaterial("seatDarkMat", scene);
  seatDark.diffuseColor = new Color3(0.08, 0.08, 0.12);
  seatDark.specularColor = new Color3(0.02, 0.02, 0.02);

  const seatMid = new StandardMaterial("seatMidMat", scene);
  seatMid.diffuseColor = new Color3(0.12, 0.12, 0.18);
  seatMid.specularColor = new Color3(0.02, 0.02, 0.02);

  const seatAccent = new StandardMaterial("seatAccentMat", scene);
  seatAccent.diffuseColor = new Color3(0.18, 0.10, 0.08);
  seatAccent.specularColor = new Color3(0.02, 0.02, 0.02);

  const SEAT_TIERS = 3;
  const TIER_HEIGHT = 4.5;
  const TIER_DEPTH = 8;

  // -- Behind baseline (home end, -X) --
  for (let t = 0; t < SEAT_TIERS; t++) {
    const w = COURT_WIDTH + 14 + t * 6;
    const h = TIER_HEIGHT;
    const d = TIER_DEPTH;
    const xBase = -HALF_LENGTH - 4 - t * TIER_DEPTH - d / 2;
    const y = t * TIER_HEIGHT + h / 2;
    const mat = t === 1 ? seatAccent : (t === 0 ? seatMid : seatDark);

    const tier = MeshBuilder.CreateBox(`seatHomeEnd_t${t}`, { width: d, height: h, depth: w }, scene);
    tier.position = new Vector3(xBase, y, 0);
    tier.material = mat;
  }

  // -- Behind baseline (away end, +X) --
  for (let t = 0; t < SEAT_TIERS; t++) {
    const w = COURT_WIDTH + 14 + t * 6;
    const h = TIER_HEIGHT;
    const d = TIER_DEPTH;
    const xBase = HALF_LENGTH + 4 + t * TIER_DEPTH + d / 2;
    const y = t * TIER_HEIGHT + h / 2;
    const mat = t === 1 ? seatAccent : (t === 0 ? seatMid : seatDark);

    const tier = MeshBuilder.CreateBox(`seatAwayEnd_t${t}`, { width: d, height: h, depth: w }, scene);
    tier.position = new Vector3(xBase, y, 0);
    tier.material = mat;
  }

  // -- Sideline seating (both sides) --
  for (const side of [1, -1] as const) {
    for (let t = 0; t < SEAT_TIERS; t++) {
      const len = COURT_LENGTH + 10;
      const h = TIER_HEIGHT;
      const d = TIER_DEPTH;
      const zBase = side * (HALF_WIDTH + 3 + t * TIER_DEPTH + d / 2);
      const y = t * TIER_HEIGHT + h / 2;
      const mat = t === 1 ? seatAccent : (t === 0 ? seatMid : seatDark);

      const tier = MeshBuilder.CreateBox(`seatSide_${side > 0 ? "pos" : "neg"}_t${t}`, { width: len, height: h, depth: d }, scene);
      tier.position = new Vector3(0, y, zBase);
      tier.material = mat;
    }
  }

  // -- Arena ceiling/rafters suggestion: a dark overhead plane at height ~55 ft --
  const ceiling = MeshBuilder.CreateGround("arenaCeiling", { width: COURT_LENGTH + 80, height: COURT_WIDTH + 80 }, scene);
  ceiling.position = new Vector3(0, 56, 0);
  ceiling.rotation.x = Math.PI; // flip so normals face down
  const ceilMat = new StandardMaterial("ceilMat", scene);
  ceilMat.diffuseColor = new Color3(0.04, 0.04, 0.06);
  ceilMat.specularColor = Color3.Black();
  ceiling.material = ceilMat;
}

// ---------------------------------------------------------------------------
// Sideline furniture
// ---------------------------------------------------------------------------

function buildSidelineFurniture(scene: Scene): void {
  const benchMat = createMat(scene, "benchMat", new Color3(0.20, 0.20, 0.22));
  const tableMat = createMat(scene, "tableMat", new Color3(0.28, 0.26, 0.24));

  const benchZ = HALF_WIDTH + 2.5;
  const benchLength = 18;
  const benchHeight = 0.5;

  const homeBench = MeshBuilder.CreateBox("homeBench", {
    width: benchLength, height: benchHeight, depth: 2.0,
  }, scene);
  homeBench.position = new Vector3(-12, benchHeight / 2, benchZ);
  homeBench.material = benchMat;

  const awayBench = MeshBuilder.CreateBox("awayBench", {
    width: benchLength, height: benchHeight, depth: 2.0,
  }, scene);
  awayBench.position = new Vector3(12, benchHeight / 2, -benchZ);
  awayBench.material = benchMat;

  // Scorer's table
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
