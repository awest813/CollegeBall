/**
 * ArenaLighting – broadcast-quality three-point light rig for the court scene.
 *
 * Light roles:
 *   ambient  – very dark hemisphere, provides base illumination / arena feel
 *   key      – strong warm directional from above the scorer's table side;
 *              the primary shadow-casting light
 *   fill     – soft cool directional from the opposite side; opens shadows
 *   rim      – subtle backlight for silhouette separation on players
 *
 * The three-light setup is inspired by TV broadcast production:
 * "stylized low-poly players with nice arena lighting that makes them look
 *  significantly better than the raw model budget would suggest."
 *
 * Shadow notes:
 *   Shadows are optional (enableShadows flag).  Keep disabled for lower-end
 *   devices; the lighting alone makes a significant visual difference.
 *   When enabled, only the key light casts shadows at 512×512 (performance safe).
 */

import {
  Scene,
  DirectionalLight,
  HemisphericLight,
  ShadowGenerator,
  Vector3,
  Color3,
  Mesh,
} from "@babylonjs/core";

export interface ArenaLightingResult {
  ambientLight: HemisphericLight;
  keyLight: DirectionalLight;
  fillLight: DirectionalLight;
  rimLight: DirectionalLight;
  /** Null when shadows are disabled. */
  shadowGenerator: ShadowGenerator | null;
}

export function setupArenaLighting(
  scene: Scene,
  enableShadows = false
): ArenaLightingResult {
  // ----- Ambient (hemisphere — very dark for arena feel) -----
  const ambient = new HemisphericLight(
    "arenaAmbient",
    new Vector3(0, 1, 0),
    scene
  );
  ambient.intensity = 0.22;
  ambient.diffuse = new Color3(0.45, 0.48, 0.60);  // slightly cool sky dome
  ambient.groundColor = new Color3(0.10, 0.09, 0.11); // near-black underside

  // ----- Key light (warm, from scorer's-table side, elevated) -----
  const key = new DirectionalLight(
    "arenaKey",
    new Vector3(-0.35, -1.0, 0.18),
    scene
  );
  key.position = new Vector3(-15, 55, 8); // used for shadow frustum
  key.intensity = 1.6;
  key.diffuse = new Color3(1.00, 0.96, 0.84); // warm arena-tungsten
  key.specular = new Color3(0.85, 0.82, 0.70);

  // ----- Fill light (cool, opposite side, softer) -----
  const fill = new DirectionalLight(
    "arenaFill",
    new Vector3(0.28, -0.75, -0.12),
    scene
  );
  fill.intensity = 0.60;
  fill.diffuse = new Color3(0.72, 0.78, 1.00); // cooler blue-white
  fill.specular = new Color3(0.0, 0.0, 0.0);   // no fill specular

  // ----- Rim / separation light (subtle back light, cool) -----
  const rim = new DirectionalLight(
    "arenaRim",
    new Vector3(0.0, -0.28, -1.0),
    scene
  );
  rim.intensity = 0.18;
  rim.diffuse = new Color3(0.55, 0.65, 1.00);
  rim.specular = new Color3(0.0, 0.0, 0.0);

  // ----- Optional shadows (key light only) -----
  let shadowGenerator: ShadowGenerator | null = null;
  if (enableShadows) {
    shadowGenerator = new ShadowGenerator(512, key);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 12;
    shadowGenerator.darkness = 0.55;
  }

  return { ambientLight: ambient, keyLight: key, fillLight: fill, rimLight: rim, shadowGenerator };
}

/**
 * Register meshes with the shadow system.
 * Call after all player/ball meshes are created if shadows are enabled.
 */
export function registerShadowCasters(
  gen: ShadowGenerator,
  casters: Mesh[],
  receivers: Mesh[]
): void {
  for (const m of casters) gen.addShadowCaster(m);
  for (const m of receivers) m.receiveShadows = true;
}
