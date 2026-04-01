/**
 * BroadcastCamera – a fixed side-court camera that tracks the ball.
 *
 * Mimics the long-lens broadcast angle typical of TV basketball:
 *   • Camera body sits at the long sideline, slightly elevated
 *   • Target position smoothly tracks the ball's court X position
 *   • Z-axis (width) tracking is damped to prevent jittery side movement
 *   • Supports dead-ball framing (snap to centre court)
 *   • Mouse / touch orbit still available for dev / replay inspection
 *
 * Extensibility:
 *   • Add a second UniversalCamera for close-up replays
 *   • setActive(camera) to switch between broadcast and replay
 *   • Expose `radius` tweaks for zoom-in on key plays
 */

import {
  Scene,
  ArcRotateCamera,
  Vector3,
} from "@babylonjs/core";

export interface BroadcastCameraOptions {
  /** Height above court of the camera body (ft). */
  height?: number;
  /** Lateral distance from court centreline to camera (ft). */
  lateralOffset?: number;
  /** How quickly the camera target follows ball X (0–1 per frame, lerp factor). */
  trackSpeedX?: number;
  /** How much the Z component of ball position influences the target (0–1). */
  trackWeightZ?: number;
}

const DEFAULTS: Required<BroadcastCameraOptions> = {
  height: 38,
  lateralOffset: 72,
  trackSpeedX: 0.045,
  trackWeightZ: 0.25,
};

export class BroadcastCamera {
  private camera: ArcRotateCamera;
  private trackSpeedX: number;
  private trackWeightZ: number;
  private smoothedTargetX = 0;
  private smoothedTargetZ = 0;

  /** Lerp factor applied to the Babylon target each frame for smooth camera motion. */
  private static readonly CAMERA_SMOOTHING_FACTOR = 0.08;

  constructor(scene: Scene, options: BroadcastCameraOptions = {}) {
    const cfg = { ...DEFAULTS, ...options };
    this.trackSpeedX = cfg.trackSpeedX;
    this.trackWeightZ = cfg.trackWeightZ;

    // Compute spherical coordinates for the desired camera position.
    // ArcRotateCamera: target is the look-at point; radius is distance to target.
    //   alpha = -PI/2  → camera is on the -Z side (long sideline)
    //   beta          → elevation angle from vertical
    const radius = Math.sqrt(cfg.height ** 2 + cfg.lateralOffset ** 2);
    const beta = Math.atan2(cfg.lateralOffset, cfg.height);

    this.camera = new ArcRotateCamera(
      "broadcastCam",
      -Math.PI / 2, // alpha — sideline view
      beta,
      radius,
      new Vector3(0, 2, 0),
      scene
    );

    // Soft user-override limits so devs can inspect the scene
    this.camera.lowerRadiusLimit = 45;
    this.camera.upperRadiusLimit = 140;
    this.camera.lowerBetaLimit = 0.25;
    this.camera.upperBetaLimit = Math.PI / 2.05;
    this.camera.lowerAlphaLimit = -Math.PI * 0.8;
    this.camera.upperAlphaLimit = -Math.PI * 0.2;

    this.camera.attachControl(
      scene.getEngine().getRenderingCanvas()!,
      true
    );
  }

  /**
   * Call every frame to smoothly pan the camera target toward the ball.
   *
   * @param ballX  Ball position in sim X (court length axis)
   * @param ballZ  Ball position in sim Y (court width axis) → mapped to Babylon Z
   */
  update(ballX: number, ballZ: number): void {
    // Smooth the tracked position to prevent jitter
    this.smoothedTargetX +=
      (ballX - this.smoothedTargetX) * this.trackSpeedX;
    this.smoothedTargetZ +=
      (ballZ * this.trackWeightZ - this.smoothedTargetZ) * this.trackSpeedX;

    const current = this.camera.target;
    const desired = new Vector3(this.smoothedTargetX, 2, this.smoothedTargetZ);
    this.camera.target = Vector3.Lerp(current, desired, BroadcastCamera.CAMERA_SMOOTHING_FACTOR);
  }

  /** Smoothly frame the camera on a specific court location (e.g. dead ball). */
  frameCourtPosition(x: number, z: number): void {
    this.smoothedTargetX = x;
    this.smoothedTargetZ = z;
    this.camera.target = new Vector3(x, 2, z);
  }

  /** Return to centre-court framing (tip-off, half-time, etc.). */
  resetToCenter(): void {
    this.frameCourtPosition(0, 0);
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }
}
