/**
 * GameScreen – the main in-game view.
 *
 * Combines:
 *   • BabylonCanvas (3D court renderer)
 *   • Simulation loop (via useSimLoop hook)
 *   • HUD overlays (scoreboard, controls, event feed)
 *   • Render bridge (syncs sim state → Babylon meshes)
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
      // Build static court geometry
      setupCourtScene(scene);

      // Create render bridge
      const bridge = new RenderBridge(scene);
      bridgeRef.current = bridge;

      // Initialise entities once sim state is available
      const tryInit = () => {
        const simState = simLoop.getState();
        if (simState) {
          bridge.init(simState, homeTeam, awayTeam);
          sceneReadyRef.current = true;
        } else {
          // Sim state might not be ready on the very first frame; retry
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
      // Advance simulation
      simLoop.onFrame(dtMs);

      // Sync render bridge
      const simState = simLoop.getState();
      if (simState && bridgeRef.current && sceneReadyRef.current) {
        bridgeRef.current.sync(simState);
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
