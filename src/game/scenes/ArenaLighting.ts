/**
 * ArenaLighting – broadcast-quality lighting rig for the court scene.
 *
 * Light roles:
 *   ambient  – very dark hemisphere; base fill and sky-dome colour
 *   key      – strong warm directional from above the scorer's table side;
 *              the primary shadow-casting light
 *   fill     – soft cool directional from the opposite side; opens shadows
 *   rim      – subtle backlight for silhouette separation on players
 *   overhead – four SpotLights above the court simulating arena catwalks
 *
 * Shadow notes:
 *   Key light casts shadows at 1024×1024 blur-exponential quality.
 *   Set enableShadows = false on lower-end devices for a performance gain.
 */

import {
  Scene,
  DirectionalLight,
  HemisphericLight,
  SpotLight,
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
  overheadLights: SpotLight[];
  /** Null when shadows are disabled. */
  shadowGenerator: ShadowGenerator | null;
}

export function setupArenaLighting(
  scene: Scene,
  enableShadows = true
): ArenaLightingResult {
  // ----- Ambient (hemisphere — very dark for arena feel) -----
  const ambient = new HemisphericLight(
    "arenaAmbient",
    new Vector3(0, 1, 0),
    scene
  );
  ambient.intensity = 0.18;
  ambient.diffuse = new Color3(0.38, 0.42, 0.58);    // cool sky dome
  ambient.groundColor = new Color3(0.08, 0.07, 0.10); // near-black underside

  // ----- Key light (warm, from scorer's-table side, elevated) -----
  const key = new DirectionalLight(
    "arenaKey",
    new Vector3(-0.32, -1.0, 0.20),
    scene
  );
  key.position = new Vector3(-18, 58, 10);
  key.intensity = 1.55;
  key.diffuse = new Color3(1.00, 0.95, 0.82); // warm arena-tungsten
  key.specular = new Color3(0.90, 0.86, 0.72);

  // ----- Fill light (cool, opposite side, softer) -----
  const fill = new DirectionalLight(
    "arenaFill",
    new Vector3(0.25, -0.70, -0.15),
    scene
  );
  fill.intensity = 0.55;
  fill.diffuse = new Color3(0.68, 0.76, 1.00); // cooler blue-white
  fill.specular = new Color3(0.0, 0.0, 0.0);   // no fill specular

  // ----- Rim / separation light (subtle back light, cool) -----
  const rim = new DirectionalLight(
    "arenaRim",
    new Vector3(0.0, -0.25, -1.0),
    scene
  );
  rim.intensity = 0.20;
  rim.diffuse = new Color3(0.50, 0.62, 1.00);
  rim.specular = new Color3(0.0, 0.0, 0.0);

  // ----- Overhead arena catwalk SpotLights -----
  // Four lights positioned above the court at different positions to
  // simulate the multi-point lighting rig of a real arena.
  const overheadPositions: [number, number, number][] = [
    [-20,  48,  14],  // near-scorer, left quadrant
    [ 20,  48,  14],  // far end, left quadrant
    [-20,  48, -14],  // near-scorer, right quadrant
    [ 20,  48, -14],  // far end, right quadrant
  ];

  const overheadLights: SpotLight[] = overheadPositions.map((pos, i) => {
    const spot = new SpotLight(
      `arenaOverhead_${i}`,
      new Vector3(...pos),
      new Vector3(0, -1, 0),  // point straight down
      Math.PI / 3.2,           // 56° cone
      2.5,                     // soft falloff exponent
      scene
    );
    spot.intensity = 0.30;
    spot.diffuse = new Color3(0.95, 0.92, 0.82); // warm white
    spot.specular = new Color3(0.40, 0.38, 0.30);
    return spot;
  });

  // ----- Optional shadows (key light only, 1024 quality) -----
  let shadowGenerator: ShadowGenerator | null = null;
  if (enableShadows) {
    shadowGenerator = new ShadowGenerator(1024, key);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 16;
    shadowGenerator.darkness = 0.50;
    shadowGenerator.transparencyShadow = true;
  }

  return {
    ambientLight: ambient,
    keyLight: key,
    fillLight: fill,
    rimLight: rim,
    overheadLights,
    shadowGenerator,
  };
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
