import { useCallback, useEffect, useRef } from "react";
import { Scene } from "@babylonjs/core";
import BabylonCanvas from "../components/BabylonCanvas";
import { setupCourtScene } from "../game/scenes/CourtScene";
import { RenderBridge } from "../game/rendering/RenderBridge";
import { useSimLoop } from "../hooks/useSimLoop";
import { useGameStore } from "../store/gameStore";
import Scoreboard from "../ui/Scoreboard";
import GameControls from "../ui/GameControls";
import EventFeed from "../ui/EventFeed";
import PostGameOverlay from "../ui/PostGameOverlay";
import MatchPhaseOverlay from "../ui/MatchPhaseOverlay";
import GameMenuOverlay from "../ui/GameMenuOverlay";

export default function GameScreen() {
  const bridgeRef = useRef<RenderBridge | null>(null);
  const sceneReadyRef = useRef(false);
  const simLoop = useSimLoop();

  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const simStatus = useGameStore((s) => s.simStatus);
  const isPauseMenuOpen = useGameStore((s) => s.isPauseMenuOpen);
  const togglePauseMenu = useGameStore((s) => s.togglePauseMenu);
  const closePauseMenu = useGameStore((s) => s.closePauseMenu);

  const prevCameraMode = useRef(cameraMode);
  if (cameraMode !== prevCameraMode.current) {
    prevCameraMode.current = cameraMode;
    bridgeRef.current?.setCameraMode(cameraMode);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (simStatus !== "running" && simStatus !== "paused") {
        return;
      }

      event.preventDefault();
      togglePauseMenu();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [simStatus, togglePauseMenu]);

  useEffect(() => {
    if (simStatus === "finished" && isPauseMenuOpen) {
      closePauseMenu();
    }
  }, [simStatus, isPauseMenuOpen, closePauseMenu]);

  const onSceneReady = useCallback(
    (scene: Scene) => {
      setupCourtScene(scene);

      const bridge = new RenderBridge(scene);
      bridgeRef.current = bridge;

      const tryInit = () => {
        const simState = simLoop.getState();
        if (simState) {
          bridge.init(simState, homeTeam, awayTeam);
          bridge.setCameraMode(useGameStore.getState().cameraMode);
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

      simLoop.onFrame(dtMs);

      const simState = simLoop.getState();
      if (simState && bridgeRef.current && sceneReadyRef.current) {
        bridgeRef.current.sync(simState, dtSec);
      }
    },
    [simLoop]
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <BabylonCanvas
        onSceneReady={onSceneReady}
        onRender={onRender}
        className="h-full w-full"
      />

      <Scoreboard />
      <GameControls />
      <EventFeed />
      <MatchPhaseOverlay />
      <GameMenuOverlay />
      <PostGameOverlay />
    </div>
  );
}
