/**
 * BroadcastCamera – multi-mode game camera with smooth mode transitions.
 *
 * Supports three perspectives:
 *   broadcast – long-sideline TV angle (mimics traditional basketball broadcasts)
 *   overhead   – top-down birds-eye view for full-court awareness
 *   endzone    – behind-the-basket angle looking down the full length of the court
 *
 * Switching modes triggers a smooth spherical interpolation (lerp on alpha/beta/radius)
 * so the camera glides to the new viewpoint rather than cutting instantly.
 */

import {
  Scene,
  ArcRotateCamera,
  Vector3,
} from "@babylonjs/core";
import type { CameraMode } from "../types";

// ---------------------------------------------------------------------------
// Per-mode camera configurations
// ---------------------------------------------------------------------------

interface ModeConfig {
  /** Horizontal orbit angle (radians). */
  alpha: number;
  /** Vertical orbit angle from straight-up (radians). */
  beta: number;
  /** Distance from target (ft). */
  radius: number;
  /** Whether this mode tracks the ball position on X. */
  trackBallX: boolean;
  /** How quickly the target follows ball X (lerp factor per frame). */
  trackSpeedX: number;
  /** How much the Z component of ball position influences the target. */
  trackWeightZ: number;
}

// Broadcast: side-court TV angle
const _h = 38;  // camera height (ft)
const _d = 72;  // lateral offset from centreline (ft)

const MODE_CONFIGS: Record<CameraMode, ModeConfig> = {
  broadcast: {
    alpha: -Math.PI / 2,
    beta: Math.atan2(_d, _h),
    radius: Math.sqrt(_h * _h + _d * _d),
    trackBallX: true,
    trackSpeedX: 0.045,
    trackWeightZ: 0.25,
  },
  overhead: {
    alpha: -Math.PI / 2,
    beta: 0.12,          // nearly straight down
    radius: 95,
    trackBallX: true,
    trackSpeedX: 0.055,
    trackWeightZ: 0.3,
  },
  endzone: {
    alpha: 0,            // camera on +X axis, looking back toward court
    beta: 0.72,
    radius: 88,
    trackBallX: false,   // fixed overview of the whole court
    trackSpeedX: 0,
    trackWeightZ: 0,
  },
};

/** Lerp factor for smooth mode transitions (alpha/beta/radius). */
const TRANSITION_SPEED = 0.06;
/** Lerp factor applied to camera target position each frame. */
const TARGET_SMOOTHING = 0.08;

// ---------------------------------------------------------------------------
// BroadcastCamera
// ---------------------------------------------------------------------------

export class BroadcastCamera {
  private camera: ArcRotateCamera;
  private currentMode: CameraMode = "broadcast";

  // Smoothed tracking values for the camera target
  private smoothedTargetX = 0;
  private smoothedTargetZ = 0;

  // Destination spherical coordinates (smoothed toward each frame)
  private desiredAlpha: number;
  private desiredBeta: number;
  private desiredRadius: number;

  constructor(scene: Scene, initialMode: CameraMode = "broadcast") {
    const cfg = MODE_CONFIGS[initialMode];
    this.currentMode = initialMode;
    this.desiredAlpha = cfg.alpha;
    this.desiredBeta = cfg.beta;
    this.desiredRadius = cfg.radius;

    this.camera = new ArcRotateCamera(
      "broadcastCam",
      cfg.alpha,
      cfg.beta,
      cfg.radius,
      new Vector3(0, 2, 0),
      scene
    );

    // Allow dev/inspection overrides with soft limits
    this.camera.lowerRadiusLimit = 40;
    this.camera.upperRadiusLimit = 150;
    this.camera.lowerBetaLimit = 0.08;
    this.camera.upperBetaLimit = Math.PI / 2.0;

    this.camera.attachControl(
      scene.getEngine().getRenderingCanvas()!,
      true
    );
  }

  // ---------------------------------------------------------------------------
  // Mode switching
  // ---------------------------------------------------------------------------

  /** Switch to a new camera perspective. The transition is smoothly animated. */
  setMode(mode: CameraMode): void {
    if (mode === this.currentMode) return;
    this.currentMode = mode;
    const cfg = MODE_CONFIGS[mode];
    this.desiredAlpha = cfg.alpha;
    this.desiredBeta = cfg.beta;
    this.desiredRadius = cfg.radius;
  }

  getMode(): CameraMode {
    return this.currentMode;
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  /**
   * Call every frame. Smoothly moves camera toward its desired configuration
   * and tracks the ball according to the active mode.
   *
   * @param ballX  Ball sim-X (court length axis)
   * @param ballZ  Ball sim-Y (court width axis) → Babylon Z
   */
  update(ballX: number, ballZ: number): void {
    const cfg = MODE_CONFIGS[this.currentMode];

    // ── 1. Smooth camera orbit toward desired mode config ────────────────
    this.camera.alpha +=
      (this.desiredAlpha - this.camera.alpha) * TRANSITION_SPEED;
    this.camera.beta +=
      (this.desiredBeta - this.camera.beta) * TRANSITION_SPEED;
    this.camera.radius +=
      (this.desiredRadius - this.camera.radius) * TRANSITION_SPEED;

    // ── 2. Compute desired target from ball tracking ──────────────────────
    if (cfg.trackBallX) {
      this.smoothedTargetX +=
        (ballX - this.smoothedTargetX) * cfg.trackSpeedX;
      this.smoothedTargetZ +=
        (ballZ * cfg.trackWeightZ - this.smoothedTargetZ) * cfg.trackSpeedX;
    } else {
      // Drift toward court centre when not tracking
      this.smoothedTargetX += (0 - this.smoothedTargetX) * 0.02;
      this.smoothedTargetZ += (0 - this.smoothedTargetZ) * 0.02;
    }

    const desired = new Vector3(this.smoothedTargetX, 2, this.smoothedTargetZ);
    this.camera.target = Vector3.Lerp(
      this.camera.target,
      desired,
      TARGET_SMOOTHING
    );
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /** Snap camera target to a specific court position (e.g. during dead ball). */
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

