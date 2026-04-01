/**
 * Central game state store powered by Zustand.
 *
 * This is the single source of truth that React UI reads from.
 * The simulation engine writes to it each tick via `applySimState`.
 * UI controls (play/pause, speed) also mutate it directly.
 */

import { create } from "zustand";
import type {
  Screen,
  GameSpeed,
  SimStatus,
  Team,
  ScoreState,
  GameClock,
  ShotClock,
  Possession,
  SimulationState,
  GameSettings,
  SimPlayer,
} from "../game/types";
import {
  defaultHomeTeam,
  defaultAwayTeam,
  defaultGameSettings,
} from "../game/data/defaults";

export interface GameStore {
  // ---- Navigation ----
  screen: Screen;
  setScreen: (s: Screen) => void;

  // ---- Teams ----
  homeTeam: Team;
  awayTeam: Team;

  // ---- Settings ----
  settings: GameSettings;

  // ---- Simulation control ----
  simStatus: SimStatus;
  gameSpeed: GameSpeed;
  setSimStatus: (s: SimStatus) => void;
  setGameSpeed: (s: GameSpeed) => void;

  // ---- Live game state (written by sim each tick) ----
  score: ScoreState;
  gameClock: GameClock;
  shotClock: ShotClock;
  possession: Possession;
  simPlayers: SimPlayer[];
  ballPosition: { x: number; y: number };
  ballHeight: number;
  shotInFlight: boolean;

  // ---- Actions ----
  /** Initialise a new exhibition game with default data. */
  startExhibition: () => void;
  /** Apply the latest simulation snapshot to the store. */
  applySimState: (state: SimulationState) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  // Navigation
  screen: "menu",
  setScreen: (screen) => set({ screen }),

  // Teams
  homeTeam: defaultHomeTeam,
  awayTeam: defaultAwayTeam,

  // Settings
  settings: defaultGameSettings,

  // Simulation control
  simStatus: "idle",
  gameSpeed: 1,
  setSimStatus: (simStatus) => set({ simStatus }),
  setGameSpeed: (gameSpeed) => set({ gameSpeed }),

  // Live game state defaults
  score: { home: 0, away: 0 },
  gameClock: { remaining: defaultGameSettings.halfLength, half: 1, running: false },
  shotClock: { remaining: defaultGameSettings.shotClockLength, running: false },
  possession: { team: "home", ballHandlerId: null },
  simPlayers: [],
  ballPosition: { x: 0, y: 0 },
  ballHeight: 0,
  shotInFlight: false,

  // Actions
  startExhibition: () =>
    set({
      screen: "game",
      simStatus: "running",
      score: { home: 0, away: 0 },
      gameClock: {
        remaining: defaultGameSettings.halfLength,
        half: 1,
        running: true,
      },
      shotClock: {
        remaining: defaultGameSettings.shotClockLength,
        running: true,
      },
      possession: {
        team: "home",
        ballHandlerId: defaultHomeTeam.lineup[0],
      },
    }),

  applySimState: (state) =>
    set({
      score: state.score,
      gameClock: state.gameClock,
      shotClock: state.shotClock,
      possession: state.possession,
      simPlayers: state.players,
      ballPosition: state.ballPosition,
      ballHeight: state.ballHeight,
      shotInFlight: state.shotInFlight,
    }),
}));
