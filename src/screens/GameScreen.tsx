import { useCallback, useEffect, useRef } from "react";
import { Scene } from "@babylonjs/core";
import BabylonCanvas from "../components/BabylonCanvas";
import { setupCourtScene } from "../game/scenes/CourtScene";
import { RenderBridge } from "../game/rendering/RenderBridge";
import { serializeDebugState } from "../game/sim/debugState";
import { useSimLoop } from "../hooks/useSimLoop";
import { useGameStore } from "../store/gameStore";
import Scoreboard from "../ui/Scoreboard";
import GameControls from "../ui/GameControls";
import EventFeed from "../ui/EventFeed";
import PostGameOverlay from "../ui/PostGameOverlay";
import MatchPhaseOverlay from "../ui/MatchPhaseOverlay";
import GameMenuOverlay from "../ui/GameMenuOverlay";

export default function GameScreen() {
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await container.requestFullscreen();
    }

    window.dispatchEvent(new Event("resize"));
  }, []);

  const prevCameraMode = useRef(cameraMode);
  if (cameraMode !== prevCameraMode.current) {
    prevCameraMode.current = cameraMode;
    bridgeRef.current?.setCameraMode(cameraMode);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f") {
        if (simStatus !== "running" && simStatus !== "paused") {
          return;
        }

        event.preventDefault();
        void toggleFullscreen();
        return;
      }

      if (event.key !== "Escape") {
        return;
      }

      if (document.fullscreenElement) {
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
  }, [simStatus, togglePauseMenu, toggleFullscreen]);

  useEffect(() => {
    window.render_game_to_text = () => {
      const state = useGameStore.getState();
      return serializeDebugState({
        screen: state.screen,
        simStatus: state.simStatus,
        phase: state.phase,
        cameraMode: state.cameraMode,
        score: state.score,
        gameClock: state.gameClock,
        shotClock: state.shotClock,
        possession: state.possession,
        ballPosition: state.ballPosition,
        ballHeight: state.ballHeight,
        shotInFlight: state.shotInFlight,
        simPlayers: state.simPlayers,
        latestEvents: state.latestEvents,
        homeTeam: state.homeTeam,
        awayTeam: state.awayTeam,
      });
    };

    window.advanceTime = (ms: number) => {
      simLoop.advanceByMs(ms);
    };

    window.toggleCollegeBallFullscreen = async () => {
      await toggleFullscreen();
    };

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
      delete window.toggleCollegeBallFullscreen;
    };
  }, [simLoop, toggleFullscreen]);

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
      // Cap delta so a tab wake / hitch does not spike animation smoothing or controls.
      const dtMs = Math.min(scene.getEngine().getDeltaTime(), 100);
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
    <div
      ref={containerRef}
      className="relative h-screen w-screen overflow-hidden bg-black"
    >
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
