/**
 * PlayerVisual – creates and manages the 3D visual representation of a player.
 *
 * Pipeline:
 *   1. `createPlayerVisual` immediately builds a three-part humanoid primitive
 *      (legs + torso + head) so the game can start rendering without waiting
 *      for any asset download.
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
 *   • Jersey number is baked onto the torso via DynamicTexture
 *   • When GLB is loaded: procedural offsets are skipped; the GLB skeleton
 *     provides all motion.  The GlbAnimationController handles clip crossfades.
 *   • Dispose via `disposePlayerVisual` to avoid scene leaks
 *
 * Extensibility hooks:
 *   • Swap `player_base.glb` filename in `loadGlbForPlayer` when models vary
 *     by position (guard / forward / center).
 *   • Register additional AnimationGroup name aliases in GLB_ANIM_ALIASES.
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
 *
 * Cross-fading is driven externally via `updateBlend(blendIn)` each frame,
 * where `blendIn` comes directly from `AnimationState.blendIn`.  This keeps
 * the timing logic in `AnimationStateMachine` and the clip management here.
 */
export class GlbAnimationController {
  private groups: Map<AnimationStateName, AnimationGroup> = new Map();
  private activeGroup: AnimationGroup | null = null;
  private prevGroup:   AnimationGroup | null = null;
  private activeName:  AnimationStateName | null = null;

  constructor(allGroups: AnimationGroup[]) {
    // Stop everything first so no clip auto-plays from the GLB import
    for (const g of allGroups) g.stop();

    // Build the state-name → group mapping from aliases
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

  /**
   * Begin transitioning to a new animation state.
   * Safe to call every frame — returns immediately when the state hasn't changed.
   *
   * The actual weight values are applied by `updateBlend` so that the caller
   * (updatePlayerVisual) drives timing from `AnimationState.blendIn`.
   */
  transition(name: AnimationStateName): void {
    if (name === this.activeName) return;

    const next = this.groups.get(name) ?? this.groups.get("idle") ?? null;
    if (!next) return;

    // Stop any lingering prev group before overwriting the reference
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

  /**
   * Update clip weights each frame based on the current blend-in progress.
   *
   * @param blendIn  0 = fully the previous clip; 1 = fully the new clip.
   */
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

  /** Stop all clips.  Does NOT dispose them — the scene owns AnimationGroups. */
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
  /** Primitive fallback meshes (legs, torso, head). */
  meshes: Mesh[];
  /** Animation state — updated by RenderBridge each frame. */
  animState: AnimationState;
  /** Cached torso mesh for material swaps. */
  torsoMesh: Mesh;
  /** Cached head mesh (used for arm-raise offset in primitive path). */
  headMesh: Mesh;
  /**
   * GLB animation controller — null until a GLB model has been loaded.
   * When non-null, clip playback replaces the procedural motion helpers.
   */
  glbController: GlbAnimationController | null;
  /**
   * True once `loadGlbForPlayer` has successfully loaded the GLB.
   * Primitive meshes are hidden and the GLB hierarchy is active.
   */
  glbLoaded: boolean;
}

// ---------------------------------------------------------------------------
// Shared material cache (one material per team × side combination)
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
  mat.diffuseColor  = color;
  mat.specularColor = specular;
  _matCache.set(key, mat);
  return mat;
}

/** Clear the shared material cache — call when starting a new scene/game. */
export function clearPlayerMaterialCache(): void {
  _matCache.clear();
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse a hex color string (#rgb, #rrggbb) into a Babylon Color3.
 * Falls back to white if the string is malformed.
 */
function parseHexColor(hex: string): Color3 {
  try {
    const clean = hex.startsWith("#") ? hex : `#${hex}`;
    if (clean.length === 4) {
      const r = clean[1];
      const g = clean[2];
      const b = clean[3];
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
// Primitive fallback builder
// ---------------------------------------------------------------------------

/**
 * Creates a three-part humanoid primitive:
 *   Legs cylinder  (shorts color, lower body)
 *   Torso cylinder (jersey color, upper body — number baked via DynamicTexture)
 *   Head sphere    (skin tone)
 *
 * Total tessellation budget ≈ 200 triangles.
 */
function createPrimitiveFallback(
  scene: Scene,
  config: PlayerVisualConfig
): Omit<PlayerVisualEntity, "id" | "teamId" | "animState" | "glbController" | "glbLoaded"> {
  const { id, team, isHome, number } = config;
  const prefix = `plr_${id}`;

  const root = new TransformNode(`${prefix}_root`, scene);

  // Determine jersey / shorts colors based on home vs away
  const jerseyHex  = isHome ? team.primaryColor   : team.secondaryColor;
  const shortsHex  = isHome ? team.secondaryColor  : team.primaryColor;
  const jerseyColor = parseHexColor(jerseyHex);
  const shortsColor = parseHexColor(shortsHex);
  const skinColor   = new Color3(0.82, 0.67, 0.52);

  const shortsMat = cachedMat(scene, `shorts_${team.id}_${isHome ? "home" : "away"}`, shortsColor);
  const skinMat   = cachedMat(scene, "skin", skinColor);

  // --- Legs ---
  const legs = MeshBuilder.CreateCylinder(
    `${prefix}_legs`,
    { height: 1.7, diameter: 0.72, tessellation: 10 },
    scene
  );
  legs.position = new Vector3(0, 0.85, 0);
  legs.material = shortsMat;
  legs.parent   = root;

  // --- Torso (jersey) ---
  const torso = MeshBuilder.CreateCylinder(
    `${prefix}_torso`,
    { height: 1.7, diameterTop: 0.82, diameterBottom: 0.72, tessellation: 10 },
    scene
  );
  torso.position = new Vector3(0, 2.25, 0);
  torso.material = buildNumberMaterial(scene, `${prefix}_jersey`, number, jerseyColor, shortsHex);
  torso.parent   = root;

  // --- Head ---
  const head = MeshBuilder.CreateSphere(
    `${prefix}_head`,
    { diameter: 0.68, segments: 8 },
    scene
  );
  head.position = new Vector3(0, 3.4, 0);
  head.material = skinMat;
  head.parent   = root;

  return { root, meshes: [legs, torso, head], torsoMesh: torso, headMesh: head };
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
    const size  = 128;
    const tex   = new DynamicTexture(`${name}_tex`, { width: size, height: size }, scene, false);
    const ctx2d = tex.getContext() as unknown as CanvasRenderingContext2D;

    ctx2d.fillStyle = colorToCSS(jerseyColor);
    ctx2d.fillRect(0, 0, size, size);

    ctx2d.font          = "bold 72px Arial";
    ctx2d.textAlign     = "center";
    ctx2d.textBaseline  = "middle";
    ctx2d.fillStyle     = secondaryHex.startsWith("#") ? secondaryHex : `#${secondaryHex}`;
    ctx2d.fillText(String(number), size / 2, size / 2 + 4);
    tex.update();

    const mat = new StandardMaterial(name, scene);
    mat.diffuseTexture = tex;
    mat.specularColor  = new Color3(0.06, 0.06, 0.06);
    return mat;
  } catch {
    return cachedMat(scene, `${name}_fallback`, jerseyColor);
  }
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Create a PlayerVisualEntity with the primitive fallback active immediately.
 *
 * Call `loadGlbForPlayer(entity, scene)` afterwards (without await) to attempt
 * a GLB upgrade.  The entity continues to work with primitive meshes if the
 * GLB is unavailable.
 */
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

/**
 * Attempt to load the HVGirl character model from the Babylon.js asset library
 * and attach it to an existing entity.
 *
 * Asset: https://assets.babylonjs.com/meshes/HVGirl.glb
 * Animations bundled in HVGirl.glb: Idle, Walk, Run, Dance
 *   • Idle  → AnimationStateName "idle"
 *   • Walk  → AnimationStateName "jog"
 *   • Run   → AnimationStateName "run"
 *   • Dance → AnimationStateName "celebrate"
 *
 * HVGirl is modelled in metres; the CollegeBall court uses feet as the
 * Babylon unit (94 ft × 50 ft court).  A scale of 3.5 makes her approximately
 * 6 ft tall in the scene — close to an NCAA player's height.  Adjust the
 * constant below if the model source changes.
 *
 * On success:
 *   • The imported mesh hierarchy is parented to entity.root.
 *   • entity.root.scaling is set to GLB_PLAYER_SCALE to convert metres→feet.
 *   • Primitive fallback meshes are hidden (not disposed — they serve as a
 *     safety net if the GLB is later found to be unusable).
 *   • entity.glbController is created to manage animation groups.
 *   • entity.glbLoaded is set to true.
 *
 * On failure the entity continues using primitive meshes silently.
 *
 * Fire-and-forget usage:
 *   loadGlbForPlayer(scene, entity); // no await needed
 */

/** Scale applied to entity.root when HVGirl is loaded (metres → court feet). */
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

    // Scale entity.root so the metre-scale character fits the foot-unit court.
    // This must be done before parenting so the GLB children inherit the scale.
    entity.root.scaling = new Vector3(GLB_PLAYER_SCALE, GLB_PLAYER_SCALE, GLB_PLAYER_SCALE);

    // Parent all root-level meshes from the GLB to entity.root
    for (const mesh of result.meshes) {
      if (!mesh.parent) {
        mesh.parent = entity.root;
      }
    }

    // Hide primitive fallback meshes
    for (const mesh of entity.meshes) {
      mesh.isVisible = false;
    }

    entity.glbController = new GlbAnimationController(result.animationGroups);
    entity.glbLoaded     = true;
  } catch {
    // GLB unavailable or load failed — primitive fallback remains active.
  }
}

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------

const HEAD_ARM_RAISE_MAX = 0.30; // units upward at full arm-raise (primitive path)

/**
 * Reposition the visual entity and apply animation for the current frame.
 *
 * GLB path (glbLoaded = true):
 *   • Sets root position / rotation only.
 *   • Delegates clip selection and weight blending to GlbAnimationController.
 *   • No procedural offsets applied (the skeleton handles all motion).
 *
 * Primitive path (glbLoaded = false):
 *   • Applies procedural bob, lean, and arm-raise offsets.
 *
 * @param worldX      Sim x mapped to Babylon x
 * @param worldZ      Sim y mapped to Babylon z
 * @param facingAngle Rotation around Y axis in radians
 * @param speed       Movement speed in ft/s — drives procedural animation frequency
 */
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
    // GLB path: let the controller manage clip playback and crossfading
    entity.root.position.y = 0;
    entity.root.rotation.z = 0;
    entity.glbController.transition(entity.animState.name);
    entity.glbController.updateBlend(entity.animState.blendIn);
  } else {
    // Primitive path: apply procedural motion offsets
    const bob      = getProceduralBob(entity.animState, speed);
    const lean     = getProceduralLean(entity.animState, speed);
    const armRaise = getArmRaise(entity.animState);

    entity.root.position.y = bob;
    entity.root.rotation.z = lean;
    entity.headMesh.position.y = 3.4 + armRaise * HEAD_ARM_RAISE_MAX;
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/** Dispose all meshes and the root node. Stops any playing GLB clips. */
export function disposePlayerVisual(entity: PlayerVisualEntity): void {
  entity.glbController?.stop();
  for (const mesh of entity.meshes) {
    mesh.dispose();
  }
  entity.root.dispose();
}
