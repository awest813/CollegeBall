/**
 * PlayerVisual – creates and manages the 3D visual representation of a player.
 *
 * Pipeline:
 *   1. Attempts to load a shared GLB model from /assets/models/players/player_base.glb
 *   2. Falls back to a three-part humanoid primitive (legs + torso + head)
 *      if the GLB is unavailable
 *
 * Design principles:
 *   • All players share the same geometry; team color is a per-player material
 *   • Home team uses primaryColor for jersey / secondaryColor for shorts
 *   • Away team swaps those two roles (road jersey = secondary, shorts = primary)
 *   • Jersey number is baked onto the torso via DynamicTexture
 *   • Animation state offsets are applied in `updatePlayerVisual` each frame
 *   • Dispose via `disposePlayerVisual` to avoid scene leaks
 *
 * Extensibility hooks:
 *   • GLB loading slot: swap the createPrimitiveFallback call with
 *     a SceneLoader.ImportMeshAsync call when models are ready
 *   • LOD: attach a LOD system to entity.root after creation
 *   • Accessories: add child meshes to entity.root
 */

import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  DynamicTexture,
} from "@babylonjs/core";
import type { Team } from "../types";
import type { AnimationState } from "./AnimationStateMachine";
import {
  getProceduralBob,
  getProceduralLean,
  getArmRaise,
} from "./AnimationStateMachine";

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface PlayerVisualConfig {
  /** Simulation player ID — used to name meshes. */
  id: string;
  team: Team;
  /** True if this player is on the home team. */
  isHome: boolean;
  /** Jersey number displayed on the torso. */
  number: number;
}

export interface PlayerVisualEntity {
  id: string;
  teamId: string;
  /** Root TransformNode — move this to reposition the entire player. */
  root: TransformNode;
  /** All child meshes (for shadow registration, dispose, etc.). */
  meshes: Mesh[];
  /** Animation state — updated by RenderBridge each frame. */
  animState: AnimationState;
  /** Cached torso mesh for material swaps. */
  torsoMesh: Mesh;
  /** Cached head mesh (used for arm-raise offset). */
  headMesh: Mesh;
}

// ---------------------------------------------------------------------------
// Shared material cache (one material per team×side combination)
// ---------------------------------------------------------------------------

const _matCache = new Map<string, StandardMaterial>();

function cachedMat(
  scene: Scene,
  key: string,
  color: Color3,
  specular = new Color3(0.08, 0.08, 0.08)
): StandardMaterial {
  const hit = _matCache.get(key);
  if (hit) return hit;
  const mat = new StandardMaterial(key, scene);
  mat.diffuseColor = color;
  mat.specularColor = specular;
  _matCache.set(key, mat);
  return mat;
}

/** Clear the shared material cache — call when starting a new scene/game. */
export function clearPlayerMaterialCache(): void {
  _matCache.clear();
}

/**
 * Safely parse a hex color string (#rgb, #rrggbb) into a Babylon Color3.
 * Falls back to white if the string is malformed.
 */
function parseHexColor(hex: string): Color3 {
  try {
    // Ensure the string is a valid 7-character #rrggbb hex
    const clean = hex.startsWith("#") ? hex : `#${hex}`;
    if (clean.length === 4) {
      // Expand shorthand #rgb → #rrggbb
      const r = clean[1];
      const g = clean[2];
      const b = clean[3];
      return Color3.FromHexString(`#${r}${r}${g}${g}${b}${b}`);
    }
    if (clean.length === 7) {
      return Color3.FromHexString(clean);
    }
    return Color3.White();
  } catch {
    return Color3.White();
  }
}

// ---------------------------------------------------------------------------
// Primitive fallback builder
// ---------------------------------------------------------------------------

/**
 * Creates a three-part humanoid primitive:
 *   Legs cylinder  (shorts color, lower body)
 *   Torso cylinder (jersey color, upper body — number baked via DynamicTexture)
 *   Head sphere    (skin tone)
 *
 * Total tessellation budget ≈ 200 triangles — well within the 3k target.
 */
function createPrimitiveFallback(
  scene: Scene,
  config: PlayerVisualConfig
): Omit<PlayerVisualEntity, "id" | "teamId" | "animState"> {
  const { id, team, isHome, number } = config;
  const prefix = `plr_${id}`;

  const root = new TransformNode(`${prefix}_root`, scene);

  // Determine jersey / shorts colors based on home vs away
  const jerseyHex = isHome ? team.primaryColor : team.secondaryColor;
  const shortsHex = isHome ? team.secondaryColor : team.primaryColor;
  const jerseyColor = parseHexColor(jerseyHex);
  const shortsColor = parseHexColor(shortsHex);
  const skinColor = new Color3(0.82, 0.67, 0.52);

  const shortsMat = cachedMat(
    scene,
    `shorts_${team.id}_${isHome ? "home" : "away"}`,
    shortsColor
  );
  const skinMat = cachedMat(scene, "skin", skinColor);

  // --- Legs ---
  const legs = MeshBuilder.CreateCylinder(
    `${prefix}_legs`,
    { height: 1.7, diameter: 0.72, tessellation: 10 },
    scene
  );
  legs.position = new Vector3(0, 0.85, 0);
  legs.material = shortsMat;
  legs.parent = root;

  // --- Torso (jersey) ---
  const torso = MeshBuilder.CreateCylinder(
    `${prefix}_torso`,
    { height: 1.7, diameterTop: 0.82, diameterBottom: 0.72, tessellation: 10 },
    scene
  );
  torso.position = new Vector3(0, 2.25, 0);
  torso.material = buildNumberMaterial(
    scene,
    `${prefix}_jersey`,
    number,
    jerseyColor,
    shortsHex
  );
  torso.parent = root;

  // --- Head ---
  const head = MeshBuilder.CreateSphere(
    `${prefix}_head`,
    { diameter: 0.68, segments: 8 },
    scene
  );
  head.position = new Vector3(0, 3.4, 0);
  head.material = skinMat;
  head.parent = root;

  return {
    root,
    meshes: [legs, torso, head],
    torsoMesh: torso,
    headMesh: head,
  };
}

/**
 * Build a StandardMaterial with a DynamicTexture that shows the jersey number.
 * Falls back to a plain jersey color material if canvas rendering fails.
 */
function buildNumberMaterial(
  scene: Scene,
  name: string,
  number: number,
  jerseyColor: Color3,
  secondaryHex: string
): StandardMaterial {
  try {
    const size = 128;
    const tex = new DynamicTexture(`${name}_tex`, { width: size, height: size }, scene, false);
    const ctx2d = tex.getContext() as unknown as CanvasRenderingContext2D;

    // Background — jersey color
    ctx2d.fillStyle = colorToCSS(jerseyColor);
    ctx2d.fillRect(0, 0, size, size);

    // Number — secondary color, bold
    ctx2d.font = "bold 72px Arial";
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    ctx2d.fillStyle = secondaryHex.startsWith("#") ? secondaryHex : `#${secondaryHex}`;
    ctx2d.fillText(String(number), size / 2, size / 2 + 4);

    tex.update();

    const mat = new StandardMaterial(name, scene);
    mat.diffuseTexture = tex;
    mat.specularColor = new Color3(0.06, 0.06, 0.06);
    return mat;
  } catch {
    // DynamicTexture failed (e.g. headless env) — use plain color
    return cachedMat(scene, `${name}_fallback`, jerseyColor);
  }
}

function colorToCSS(c: Color3): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Create a PlayerVisualEntity.
 *
 * Currently always uses the primitive fallback.
 * To add GLB loading, replace the `createPrimitiveFallback` call with
 * a SceneLoader.ImportMeshAsync call and attach the result to `root`.
 */
export function createPlayerVisual(
  scene: Scene,
  config: PlayerVisualConfig
): PlayerVisualEntity {
  const parts = createPrimitiveFallback(scene, config);
  return {
    id: config.id,
    teamId: config.team.id,
    animState: { name: "idle", elapsed: 0, weight: 1 },
    ...parts,
  };
}

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------

const HEAD_ARM_RAISE_MAX = 0.30; // units upward at full arm-raise

/**
 * Reposition the visual entity to match the current simulation position
 * and apply procedural animation offsets.
 *
 * @param worldX  Sim x mapped to Babylon x
 * @param worldZ  Sim y mapped to Babylon z
 * @param facingAngle  Rotation around Y axis in radians
 */
export function updatePlayerVisual(
  entity: PlayerVisualEntity,
  worldX: number,
  worldZ: number,
  facingAngle: number
): void {
  const bob = getProceduralBob(entity.animState);
  const lean = getProceduralLean(entity.animState);
  const armRaise = getArmRaise(entity.animState);

  // Root position
  entity.root.position.x = worldX;
  entity.root.position.y = bob;
  entity.root.position.z = worldZ;

  // Lean (Z-axis rotation for side sway)
  entity.root.rotation.z = lean;
  entity.root.rotation.y = facingAngle;

  // Arm-raise: lift the head mesh slightly
  entity.headMesh.position.y = 3.4 + armRaise * HEAD_ARM_RAISE_MAX;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/** Dispose all meshes and the root node. */
export function disposePlayerVisual(entity: PlayerVisualEntity): void {
  for (const mesh of entity.meshes) {
    mesh.dispose();
  }
  entity.root.dispose();
}
