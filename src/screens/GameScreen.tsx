/**
 * GameScreen – the main in-game view.
 *
 * Combines:
 *   • BabylonCanvas (3D court renderer)
 *   • Simulation loop (via useSimLoop hook)
 *   • HUD overlays (scoreboard, controls, event feed)
 *   • Render bridge (syncs sim state → Babylon meshes, owns broadcast camera)
 */

import { useRef, useCallback } from "react";
import { Scene } from "@babylonjs/core";
import BabylonCanvas from "../components/BabylonCanvas";
import { setupCourtScene } from "../game/scenes/CourtScene";
import { RenderBridge } from "../game/rendering/RenderBridge";
import { useSimLoop } from "../hooks/useSimLoop";
import { useGameStore } from "../store/gameStore";
import Scoreboard from "../ui/Scoreboard";
import GameControls from "../ui/GameControls";
import EventFeed from "../ui/EventFeed";

export default function GameScreen() {
  const bridgeRef = useRef<RenderBridge | null>(null);
  const sceneReadyRef = useRef(false);
  const simLoop = useSimLoop();

  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);

  const onSceneReady = useCallback(
    (scene: Scene) => {
      // Build static court geometry + arena lighting
      setupCourtScene(scene);

      // Create render bridge (also creates broadcast camera inside init)
      const bridge = new RenderBridge(scene);
      bridgeRef.current = bridge;

      // Initialise entities once sim state is available
      const tryInit = () => {
        const simState = simLoop.getState();
        if (simState) {
          bridge.init(simState, homeTeam, awayTeam);
          sceneReadyRef.current = true;
        } else {
          setTimeout(tryInit, 50);
        }
      };
      tryInit();
    },
    [homeTeam, awayTeam, simLoop]
  );

  const onRender = useCallback(
    (scene: Scene) => {
      const dtMs = scene.getEngine().getDeltaTime();
      const dtSec = dtMs / 1000;

      // Advance simulation
      simLoop.onFrame(dtMs);

      // Sync render bridge — pass delta time for animation ticking
      const simState = simLoop.getState();
      if (simState && bridgeRef.current && sceneReadyRef.current) {
        bridgeRef.current.sync(simState, dtSec);
      }
    },
    [simLoop]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* 3D Canvas */}
      <BabylonCanvas
        onSceneReady={onSceneReady}
        onRender={onRender}
        className="w-full h-full"
      />

      {/* HUD Overlays */}
      <Scoreboard />
      <GameControls />
      <EventFeed />
    </div>
  );
}
