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
  CameraMode,
  PlayerGameStats,
  MatchPhase,
  SimEvent,
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
  isPauseMenuOpen: boolean;
  openPauseMenu: () => void;
  closePauseMenu: () => void;
  togglePauseMenu: () => void;
  returnToMainMenu: () => void;

  // ---- Teams ----
  homeTeam: Team;
  awayTeam: Team;

  // ---- Settings ----
  settings: GameSettings;

  // ---- Simulation control ----
  simStatus: SimStatus;
  gameSpeed: GameSpeed;
  cameraMode: CameraMode;
  setSimStatus: (s: SimStatus) => void;
  setGameSpeed: (s: GameSpeed) => void;
  setCameraMode: (m: CameraMode) => void;

  // ---- Live game state (written by sim each tick) ----
  score: ScoreState;
  gameClock: GameClock;
  shotClock: ShotClock;
  possession: Possession;
  simPlayers: SimPlayer[];
  ballPosition: { x: number; y: number };
  ballHeight: number;
  shotInFlight: boolean;
  /** Per-team foul count for the current half. */
  teamFouls: { home: number; away: number };
  /** Per-player game statistics accumulated across the full game. */
  playerStats: Record<string, PlayerGameStats>;
  /** The current phase of the match (e.g. PRE_GAME, IN_PLAY, FULL_TIME). */
  phase: MatchPhase;
  /** Current overtime period: 0 = regulation, 1 = first OT, 2 = second OT, … */
  overtimePeriod: number;
  /** Raw sim events emitted on the latest tick. */
  latestEvents: SimEvent[];

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
  isPauseMenuOpen: false,
  openPauseMenu: () =>
    set((state) => ({
      isPauseMenuOpen: state.simStatus !== "finished",
      simStatus: state.simStatus === "running" ? "paused" : state.simStatus,
    })),
  closePauseMenu: () =>
    set((state) => ({
      isPauseMenuOpen: false,
      simStatus: state.simStatus === "paused" ? "running" : state.simStatus,
    })),
  togglePauseMenu: () =>
    set((state) => {
      if (state.simStatus !== "running" && state.simStatus !== "paused") {
        return state;
      }

      const nextOpen = !state.isPauseMenuOpen;
      return {
        isPauseMenuOpen: nextOpen,
        simStatus:
          state.simStatus === "running" && nextOpen
            ? "paused"
            : state.simStatus === "paused" && !nextOpen
            ? "running"
            : state.simStatus,
      };
    }),
  returnToMainMenu: () =>
    set({
      screen: "menu",
      simStatus: "idle",
      isPauseMenuOpen: false,
      score: { home: 0, away: 0 },
      teamFouls: { home: 0, away: 0 },
      playerStats: {},
      phase: "PRE_GAME" as MatchPhase,
      overtimePeriod: 0,
      latestEvents: [],
      gameClock: {
        remaining: defaultGameSettings.halfLength,
        half: 1,
        running: false,
      },
      shotClock: {
        remaining: defaultGameSettings.shotClockLength,
        running: false,
      },
      possession: {
        team: "home",
        ballHandlerId: defaultHomeTeam.lineup[0],
      },
      simPlayers: [],
      ballPosition: { x: 0, y: 0 },
      ballHeight: 0,
      shotInFlight: false,
    }),

  // Teams
  homeTeam: defaultHomeTeam,
  awayTeam: defaultAwayTeam,

  // Settings
  settings: defaultGameSettings,

  // Simulation control
  simStatus: "idle",
  gameSpeed: 1,
  cameraMode: "broadcast" as CameraMode,
  setSimStatus: (simStatus) => set({ simStatus }),
  setGameSpeed: (gameSpeed) => set({ gameSpeed }),
  setCameraMode: (cameraMode) => set({ cameraMode }),

  // Live game state defaults
  score: { home: 0, away: 0 },
  gameClock: { remaining: defaultGameSettings.halfLength, half: 1, running: false },
  shotClock: { remaining: defaultGameSettings.shotClockLength, running: false },
  possession: { team: "home", ballHandlerId: null },
  simPlayers: [],
  ballPosition: { x: 0, y: 0 },
  ballHeight: 0,
  shotInFlight: false,
  teamFouls: { home: 0, away: 0 },
  playerStats: {},
  phase: "PRE_GAME" as MatchPhase,
  overtimePeriod: 0,
  latestEvents: [],

  // Actions
  startExhibition: () =>
    set({
      screen: "game",
      simStatus: "running",
      isPauseMenuOpen: false,
      score: { home: 0, away: 0 },
      teamFouls: { home: 0, away: 0 },
      playerStats: {},
      phase: "PRE_GAME" as MatchPhase,
      overtimePeriod: 0,
      latestEvents: [],
      gameClock: {
        remaining: defaultGameSettings.halfLength,
        half: 1,
        running: false,
      },
      shotClock: {
        remaining: defaultGameSettings.shotClockLength,
        running: false,
      },
      possession: {
        team: "home",
        ballHandlerId: defaultHomeTeam.lineup[0],
      },
      simPlayers: [],
      ballPosition: { x: 0, y: 0 },
      ballHeight: 3.5,
      shotInFlight: false,
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
      teamFouls: state.teamFouls,
      playerStats: state.playerStats,
      phase: state.phase,
      overtimePeriod: state.overtimePeriod,
      latestEvents: state.events,
    }),
}));
