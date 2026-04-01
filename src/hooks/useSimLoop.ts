/**
 * useSimLoop – a React hook that drives the simulation tick loop.
 *
 * It uses requestAnimationFrame (via Babylon's render loop) to tick
 * the sim engine and push the result into the Zustand store.
 *
 * The hook returns a ref-based controller so the game screen can
 * wire it into the Babylon scene's onRender callback.
 */

import { useRef, useCallback, useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import {
  tick,
  createInitialSimState,
  resetSimEngine,
} from "../game/sim/engine";
import type { SimulationState } from "../game/types";

export interface SimLoopController {
  /** Call this from Babylon's onRender to advance the sim. */
  onFrame: (dtMs: number) => void;
  /** Get the latest sim state (for the render bridge). */
  getState: () => SimulationState | null;
}

// Fixed timestep for deterministic simulation (60 Hz)
const FIXED_DT = 1 / 60;

export function useSimLoop(): SimLoopController {
  const stateRef = useRef<SimulationState | null>(null);
  const accumulatorRef = useRef(0);

  const simStatus = useGameStore((s) => s.simStatus);
  const gameSpeed = useGameStore((s) => s.gameSpeed);
  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);
  const settings = useGameStore((s) => s.settings);
  const applySimState = useGameStore((s) => s.applySimState);

  // Initialise (or re-initialise) sim state when a game starts or restarts.
  // A restart is detected when simStatus becomes "running" while the previous
  // game's clock has already stopped (Play Again after a finished game).
  useEffect(() => {
    if (simStatus === "running") {
      const needsInit =
        stateRef.current === null || !stateRef.current.gameClock.running;
      if (needsInit) {
        resetSimEngine();
        accumulatorRef.current = 0;
        stateRef.current = createInitialSimState(homeTeam, awayTeam, settings);
        applySimState(stateRef.current);
      }
    }
    if (simStatus === "idle") {
      stateRef.current = null;
    }
  }, [simStatus, homeTeam, awayTeam, settings, applySimState]);

  const onFrame = useCallback(
    (dtMs: number) => {
      if (simStatus !== "running" || !stateRef.current) return;

      const dtScaled = (dtMs / 1000) * gameSpeed;
      accumulatorRef.current += dtScaled;

      // Consume accumulated time in fixed steps
      let ticked = false;
      while (accumulatorRef.current >= FIXED_DT) {
        stateRef.current = tick(stateRef.current, FIXED_DT, settings);
        accumulatorRef.current -= FIXED_DT;
        ticked = true;

        // Check for game end
        if (!stateRef.current.gameClock.running && stateRef.current.gameClock.half === 2) {
          useGameStore.getState().setSimStatus("finished");
          break;
        }
      }

      if (ticked) {
        applySimState(stateRef.current);
      }
    },
    [simStatus, gameSpeed, settings, applySimState]
  );

  const getState = useCallback(() => stateRef.current, []);

  return { onFrame, getState };
}
