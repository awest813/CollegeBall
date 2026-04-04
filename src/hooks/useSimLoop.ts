/**
 * useSimLoop – a React hook that drives the simulation tick loop.
 *
 * It uses requestAnimationFrame (via Babylon's render loop) to tick
 * the sim engine and push the result into the Zustand store.
 *
 * The hook returns a ref-based controller so the game screen can
 * wire it into the Babylon scene's onRender callback.
 */

import { useRef, useCallback, useEffect, useMemo } from "react";
import { useGameStore } from "../store/gameStore";
import {
  tick,
  createInitialSimState,
  resetSimEngine,
} from "../game/sim/engine";
import {
  FIXED_DT,
  MAX_STEPS_PER_FRAME,
  boundedSimDeltaSeconds,
} from "../game/sim/fixedTimestep";
import type { SimulationState } from "../game/types";

export interface SimLoopController {
  /** Call this from Babylon's onRender to advance the sim. */
  onFrame: (dtMs: number) => void;
  /** Get the latest sim state (for the render bridge). */
  getState: () => SimulationState | null;
  /** Advance the sim deterministically without waiting for real time. */
  advanceByMs: (dtMs: number) => void;
}

export function useSimLoop(): SimLoopController {
  const stateRef = useRef<SimulationState | null>(null);
  const accumulatorRef = useRef(0);
  const manualControlRef = useRef(false);

  const simStatus = useGameStore((s) => s.simStatus);
  const gameSpeed = useGameStore((s) => s.gameSpeed);
  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);
  const settings = useGameStore((s) => s.settings);
  const applySimState = useGameStore((s) => s.applySimState);

  const initializeState = useCallback(() => {
    resetSimEngine();
    accumulatorRef.current = 0;
    stateRef.current = createInitialSimState(homeTeam, awayTeam, settings);
    applySimState(stateRef.current);
  }, [homeTeam, awayTeam, settings, applySimState]);

  // Initialise (or re-initialise) sim state when a game starts or restarts.
  // A restart is detected when simStatus becomes "running" while the previous
  // game's clock has already stopped (Play Again after a finished game).
  useEffect(() => {
    if (simStatus === "running") {
      manualControlRef.current = false;
      const needsInit =
        stateRef.current === null || stateRef.current.phase === "FINISHED";
      if (needsInit) {
        initializeState();
      }
    }
    if (simStatus === "idle") {
      stateRef.current = null;
      accumulatorRef.current = 0;
      manualControlRef.current = false;
    }
  }, [simStatus, initializeState]);

  const advanceByMs = useCallback(
    (dtMs: number) => {
      if ((simStatus !== "running" && simStatus !== "paused") || dtMs <= 0) {
        return;
      }

      if (stateRef.current === null || stateRef.current.phase === "FINISHED") {
        initializeState();
      }
      if (!stateRef.current) {
        return;
      }

      manualControlRef.current = true;
      accumulatorRef.current += boundedSimDeltaSeconds(dtMs, gameSpeed);

      let ticked = false;
      let steps = 0;
      while (accumulatorRef.current >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        stateRef.current = tick(stateRef.current, FIXED_DT, settings);
        accumulatorRef.current -= FIXED_DT;
        ticked = true;
        steps += 1;

        if (stateRef.current.phase === "FINISHED") {
          useGameStore.getState().setSimStatus("finished");
          break;
        }
      }

      if (ticked && stateRef.current) {
        applySimState(stateRef.current);
      }
    },
    [simStatus, gameSpeed, settings, applySimState, initializeState]
  );

  const onFrame = useCallback(
    (dtMs: number) => {
      if (simStatus !== "running" || !stateRef.current) return;
      if (manualControlRef.current) return;

      // `useEffect` can run after the first post-"Play Again" render frame. If we still
      // hold the previous game's finished snapshot, re-init here so the sim never ticks
      // a stale FINAL state before the fresh match snapshot is installed.
      if (stateRef.current.phase === "FINISHED") {
        initializeState();
      }

      accumulatorRef.current += boundedSimDeltaSeconds(dtMs, gameSpeed);

      // Consume accumulated time in fixed steps
      let ticked = false;
      let steps = 0;
      while (accumulatorRef.current >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        stateRef.current = tick(stateRef.current, FIXED_DT, settings);
        accumulatorRef.current -= FIXED_DT;
        ticked = true;
        steps += 1;

        // Check for game end
        if (stateRef.current.phase === "FINISHED") {
          useGameStore.getState().setSimStatus("finished");
          break;
        }
      }

      if (ticked) {
        applySimState(stateRef.current);
      }
    },
    [simStatus, gameSpeed, settings, applySimState, initializeState]
  );

  const getState = useCallback(() => stateRef.current, []);

  return useMemo(
    () => ({ onFrame, getState, advanceByMs }),
    [onFrame, getState, advanceByMs]
  );
}
