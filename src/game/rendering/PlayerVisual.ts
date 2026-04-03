/**
 * PlayerVisual – creates and manages the 3D visual representation of a player.
 *
 * Pipeline:
 *   1. `createPlayerVisual` immediately builds a five-part humanoid primitive
 *      (shoes + legs + torso with jersey number + arms + head) so the game can
 *      start rendering without waiting for any asset download.
 *   2. `loadGlbForPlayer` (async, fire-and-forget) attempts to load a shared
 *      GLB model from /assets/models/players/player_base.glb.  On success the
 *      primitive meshes are hidden and the GLB hierarchy is parented to the
 *      same root TransformNode.
 *   3. `GlbAnimationController` manages Babylon AnimationGroup objects loaded
 *      from the GLB: maps AnimationStateName → AnimationGroup and performs
 *      smooth cross-fading driven by AnimationState.blendIn.
 *
 * Design principles:
 *   • All players share the same geometry; team color is a per-player material
 *   • Home team uses primaryColor for jersey / secondaryColor for shorts
 *   • Away team swaps those two roles (road jersey = secondary, shorts = primary)
 *   • Jersey number is baked onto the torso via DynamicTexture with player info
 *   • Skin tone is derived from a hash of the player ID, giving natural variety
 *   • Arm meshes extend horizontally from shoulder height
 *   • When GLB is loaded: procedural offsets are skipped; the GLB skeleton
 *     provides all motion.  The GlbAnimationController handles clip crossfades.
 *   • Dispose via `disposePlayerVisual` to avoid scene leaks
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
  SceneLoader,
  AnimationGroup,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF"; // registers GLTF/GLB loader (side-effect import)
import type { Team } from "../types";
import type { AnimationState, AnimationStateName } from "./AnimationStateMachine";
import {
  getProceduralBob,
  getProceduralLean,
  getArmRaise,
} from "./AnimationStateMachine";

// ---------------------------------------------------------------------------
// GLB animation controller
// ---------------------------------------------------------------------------

/**
 * Maps each AnimationStateName to a prioritised list of candidate
 * AnimationGroup names to search for inside a loaded GLB file.
 * The first case-insensitive match wins.
 */
const GLB_ANIM_ALIASES: Record<AnimationStateName, string[]> = {
  idle:             ["Idle",            "idle",          "TPose",    "T-Pose"  ],
  jog:              ["Jog",             "jog",           "Walk",     "walk"    ],
  run:              ["Run",             "run",           "Sprint",   "sprint"  ],
  defensive_stance: ["DefensiveStance", "defensive_stance", "Crouch", "crouch" ],
  shuffle:          ["Shuffle",         "shuffle",       "SideStep", "side_step"],
  dribble_idle:     ["DribbleIdle",     "dribble_idle",  "Dribble",  "dribble" ],
  pass:             ["Pass",            "pass",          "Throw",    "throw"   ],
  shoot:            ["Shoot",           "shoot",         "JumpShot", "jump_shot"],
  rebound:          ["Rebound",         "rebound",       "Jump",     "jump"    ],
  celebrate:        ["Celebrate",       "celebrate",     "Victory",  "victory",
                     "Dance",           "dance"                                ],
  transition:       ["Transition",      "transition",    "Idle",     "idle"    ],
};

/** States whose animation clips should NOT loop. */
const NON_LOOPING_STATES = new Set<AnimationStateName>([
  "shoot", "pass", "rebound", "celebrate",
]);

/**
 * Manages Babylon AnimationGroup objects for a single GLB character.
 */
export class GlbAnimationController {
  private groups: Map<AnimationStateName, AnimationGroup> = new Map();
  private activeGroup: AnimationGroup | null = null;
  private prevGroup:   AnimationGroup | null = null;
  private activeName:  AnimationStateName | null = null;

  constructor(allGroups: AnimationGroup[]) {
    for (const g of allGroups) g.stop();

    for (const [stateName, aliases] of Object.entries(GLB_ANIM_ALIASES) as [AnimationStateName, string[]][]) {
      for (const alias of aliases) {
        const found = allGroups.find(
          (g) => g.name.toLowerCase() === alias.toLowerCase()
        );
        if (found) {
          this.groups.set(stateName, found);
          break;
        }
      }
    }
  }

  transition(name: AnimationStateName): void {
    if (name === this.activeName) return;

    const next = this.groups.get(name) ?? this.groups.get("idle") ?? null;
    if (!next) return;

    if (this.prevGroup && this.prevGroup !== this.activeGroup) {
      this.prevGroup.stop();
    }

    this.prevGroup  = this.activeGroup;
    this.activeGroup = next;
    this.activeName  = name;

    const loops = !NON_LOOPING_STATES.has(name);
    if (!next.isPlaying) {
      next.start(loops);
      next.setWeightForAllAnimatables(0);
    }
  }

  updateBlend(blendIn: number): void {
    if (this.activeGroup) {
      this.activeGroup.setWeightForAllAnimatables(blendIn);
    }
    if (this.prevGroup) {
      const prevWeight = 1 - blendIn;
      if (prevWeight <= 0) {
        this.prevGroup.stop();
        this.prevGroup = null;
      } else {
        this.prevGroup.setWeightForAllAnimatables(prevWeight);
      }
    }
  }

  stop(): void {
    for (const g of this.groups.values()) {
      if (g.isPlaying) g.stop();
    }
    this.activeGroup = null;
    this.prevGroup   = null;
    this.activeName  = null;
  }
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface PlayerVisualConfig {
  id: string;
  team: Team;
  isHome: boolean;
  number: number;
}

export interface PlayerVisualEntity {
  id: string;
  teamId: string;
  root: TransformNode;
  meshes: Mesh[];
  animState: AnimationState;
  torsoMesh: Mesh;
  headMesh: Mesh;
  glbController: GlbAnimationController | null;
  glbLoaded: boolean;
}

// ---------------------------------------------------------------------------
// Shared material cache
// ---------------------------------------------------------------------------

const _matCache = new Map<string, StandardMaterial>();

function cachedMat(
  scene: Scene,
  key: string,
  color: Color3,
  specular = new Color3(0.10, 0.10, 0.10),
  specularPower = 20
): StandardMaterial {
  const hit = _matCache.get(key);
  if (hit) return hit;
  const mat = new StandardMaterial(key, scene);
  mat.diffuseColor  = color;
  mat.specularColor = specular;
  mat.specularPower = specularPower;
  _matCache.set(key, mat);
  return mat;
}

export function clearPlayerMaterialCache(): void {
  _matCache.clear();
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function parseHexColor(hex: string): Color3 {
  try {
    const clean = hex.startsWith("#") ? hex : `#${hex}`;
    if (clean.length === 4) {
      const r = clean[1]; const g = clean[2]; const b = clean[3];
      return Color3.FromHexString(`#${r}${r}${g}${g}${b}${b}`);
    }
    if (clean.length === 7) return Color3.FromHexString(clean);
    return Color3.White();
  } catch {
    return Color3.White();
  }
}

function colorToCSS(c: Color3): string {
  return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
}

// ---------------------------------------------------------------------------
// Skin tone palette — 6 distinct tones selected by player-ID hash
// ---------------------------------------------------------------------------

const SKIN_TONES: Color3[] = [
  new Color3(0.92, 0.76, 0.60), // light
  new Color3(0.86, 0.68, 0.50), // light-medium
  new Color3(0.72, 0.54, 0.38), // medium
  new Color3(0.58, 0.40, 0.26), // medium-dark
  new Color3(0.42, 0.28, 0.16), // dark
  new Color3(0.32, 0.20, 0.10), // deep
];

function skinToneForId(id: string): Color3 {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return SKIN_TONES[hash % SKIN_TONES.length];
}

// ---------------------------------------------------------------------------
// Primitive fallback builder — five-part humanoid
// ---------------------------------------------------------------------------

function createPrimitiveFallback(
  scene: Scene,
  config: PlayerVisualConfig
): Omit<PlayerVisualEntity, "id" | "teamId" | "animState" | "glbController" | "glbLoaded"> {
  const { id, team, isHome, number } = config;
  const prefix = `plr_${id}`;

  const root = new TransformNode(`${prefix}_root`, scene);

  const jerseyHex   = isHome ? team.primaryColor   : team.secondaryColor;
  const shortsHex   = isHome ? team.secondaryColor  : team.primaryColor;
  const jerseyColor = parseHexColor(jerseyHex);
  const shortsColor = parseHexColor(shortsHex);
  const skinColor   = skinToneForId(id);

  // Slightly glossy materials for the jersey/shorts
  const shortsMat = cachedMat(
    scene,
    `shorts_${team.id}_${isHome ? "home" : "away"}`,
    shortsColor,
    new Color3(0.12, 0.12, 0.12),
    24
  );
  const skinMat = cachedMat(scene, `skin_${id}`, skinColor, new Color3(0.06, 0.04, 0.03), 12);

  // --- Shoes (flattened ellipsoid at the base) ---
  const shoe = MeshBuilder.CreateSphere(
    `${prefix}_shoes`,
    { diameterX: 0.85, diameterY: 0.32, diameterZ: 0.52, segments: 6 },
    scene
  );
  shoe.position = new Vector3(0, 0.16, 0);
  const shoeMat = cachedMat(scene, `shoe_${team.id}`, new Color3(0.12, 0.12, 0.14), new Color3(0.12, 0.12, 0.14), 32);
  shoe.material = shoeMat;
  shoe.parent   = root;

  // --- Legs ---
  const legs = MeshBuilder.CreateCylinder(
    `${prefix}_legs`,
    { height: 1.65, diameterTop: 0.74, diameterBottom: 0.64, tessellation: 10 },
    scene
  );
  legs.position = new Vector3(0, 1.1, 0);
  legs.material = shortsMat;
  legs.parent   = root;

  // --- Torso (jersey) ---
  const torso = MeshBuilder.CreateCylinder(
    `${prefix}_torso`,
    { height: 1.75, diameterTop: 0.92, diameterBottom: 0.76, tessellation: 10 },
    scene
  );
  torso.position = new Vector3(0, 2.50, 0);
  torso.material = buildNumberMaterial(scene, `${prefix}_jersey`, number, jerseyColor, shortsHex);
  torso.parent   = root;

  // --- Arms (short horizontal cylinders at shoulder level) ---
  const armMat = buildArmMaterial(scene, `${prefix}_armMat`, jerseyColor);

  const leftArm = MeshBuilder.CreateCylinder(
    `${prefix}_armL`,
    { height: 0.70, diameter: 0.26, tessellation: 8 },
    scene
  );
  leftArm.rotation.z = Math.PI / 2;
  leftArm.position = new Vector3(0, 3.15, 0.55);
  leftArm.material = armMat;
  leftArm.parent   = root;

  const rightArm = MeshBuilder.CreateCylinder(
    `${prefix}_armR`,
    { height: 0.70, diameter: 0.26, tessellation: 8 },
    scene
  );
  rightArm.rotation.z = Math.PI / 2;
  rightArm.position = new Vector3(0, 3.15, -0.55);
  rightArm.material = armMat;
  rightArm.parent   = root;

  // --- Head ---
  const head = MeshBuilder.CreateSphere(
    `${prefix}_head`,
    { diameterX: 0.70, diameterY: 0.72, diameterZ: 0.68, segments: 8 },
    scene
  );
  head.position = new Vector3(0, 3.75, 0);
  head.material = skinMat;
  head.parent   = root;

  return {
    root,
    meshes: [shoe, legs, torso, leftArm, rightArm, head],
    torsoMesh: torso,
    headMesh: head,
  };
}

/**
 * Build a StandardMaterial with a DynamicTexture showing the jersey number,
 * a thick horizontal stripe at the hem, and faint vertical ribbing.
 */
function buildNumberMaterial(
  scene: Scene,
  name: string,
  number: number,
  jerseyColor: Color3,
  secondaryHex: string
): StandardMaterial {
  try {
    const size  = 256;
    const tex   = new DynamicTexture(`${name}_tex`, { width: size, height: size }, scene, false);
    const ctx2d = tex.getContext() as unknown as CanvasRenderingContext2D;

    const jerseyCSS  = colorToCSS(jerseyColor);
    const secondaryCSS = secondaryHex.startsWith("#") ? secondaryHex : `#${secondaryHex}`;

    // Base jersey colour
    ctx2d.fillStyle = jerseyCSS;
    ctx2d.fillRect(0, 0, size, size);

    // Subtle vertical ribbing lines
    ctx2d.strokeStyle = "rgba(0,0,0,0.08)";
    ctx2d.lineWidth = 2;
    for (let x = 0; x < size; x += 14) {
      ctx2d.beginPath();
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, size);
      ctx2d.stroke();
    }

    // Hem stripe at the bottom 18% of the texture
    ctx2d.fillStyle = secondaryCSS;
    ctx2d.fillRect(0, size * 0.82, size, size * 0.18);

    // Jersey number — large, centred in the upper 80%
    ctx2d.font          = "bold 110px 'Arial Black', Arial";
    ctx2d.textAlign     = "center";
    ctx2d.textBaseline  = "middle";

    // Outline for legibility
    ctx2d.strokeStyle = "rgba(0,0,0,0.55)";
    ctx2d.lineWidth   = 6;
    ctx2d.strokeText(String(number), size / 2, size * 0.40);

    ctx2d.fillStyle   = secondaryCSS;
    ctx2d.fillText(String(number), size / 2, size * 0.40);

    tex.update();

    const mat = new StandardMaterial(name, scene);
    mat.diffuseTexture = tex;
    mat.specularColor  = new Color3(0.14, 0.14, 0.14);
    mat.specularPower  = 28;
    return mat;
  } catch {
    return cachedMat(scene, `${name}_fallback`, jerseyColor);
  }
}

/** Build an arm material that matches the jersey color with slight specularity. */
function buildArmMaterial(scene: Scene, name: string, jerseyColor: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor  = jerseyColor.scale(0.92);
  mat.specularColor = new Color3(0.10, 0.10, 0.10);
  mat.specularPower = 20;
  return mat;
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createPlayerVisual(
  scene: Scene,
  config: PlayerVisualConfig
): PlayerVisualEntity {
  const parts = createPrimitiveFallback(scene, config);
  return {
    id:            config.id,
    teamId:        config.team.id,
    animState:     { name: "idle", elapsed: 0, blendIn: 1, prevName: null },
    glbController: null,
    glbLoaded:     false,
    ...parts,
  };
}

// ---------------------------------------------------------------------------
// GLB async upgrade
// ---------------------------------------------------------------------------

const GLB_PLAYER_SCALE = 3.5;

export async function loadGlbForPlayer(
  scene: Scene,
  entity: PlayerVisualEntity
): Promise<void> {
  try {
    const result = await SceneLoader.ImportMeshAsync(
      "",
      "https://assets.babylonjs.com/meshes/",
      "HVGirl.glb",
      scene
    );

    if (!result.meshes.length) return;

    entity.root.scaling = new Vector3(GLB_PLAYER_SCALE, GLB_PLAYER_SCALE, GLB_PLAYER_SCALE);

    for (const mesh of result.meshes) {
      if (!mesh.parent) {
        mesh.parent = entity.root;
      }
    }

    for (const mesh of entity.meshes) {
      mesh.isVisible = false;
    }

    entity.glbController = new GlbAnimationController(result.animationGroups);
    entity.glbLoaded     = true;
  } catch {
    // GLB unavailable — primitive fallback remains active.
  }
}

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------

const HEAD_ARM_RAISE_MAX = 0.30;

export function updatePlayerVisual(
  entity: PlayerVisualEntity,
  worldX: number,
  worldZ: number,
  facingAngle: number,
  speed = 0
): void {
  entity.root.position.x = worldX;
  entity.root.position.z = worldZ;
  entity.root.rotation.y = facingAngle;

  if (entity.glbLoaded && entity.glbController) {
    entity.root.position.y = 0;
    entity.root.rotation.z = 0;
    entity.glbController.transition(entity.animState.name);
    entity.glbController.updateBlend(entity.animState.blendIn);
  } else {
    const bob      = getProceduralBob(entity.animState, speed);
    const lean     = getProceduralLean(entity.animState, speed);
    const armRaise = getArmRaise(entity.animState);

    entity.root.position.y = bob;
    entity.root.rotation.z = lean;
    entity.headMesh.position.y = 3.75 + armRaise * HEAD_ARM_RAISE_MAX;
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export function disposePlayerVisual(entity: PlayerVisualEntity): void {
  entity.glbController?.stop();
  for (const mesh of entity.meshes) {
    mesh.dispose();
  }
  entity.root.dispose();
}
