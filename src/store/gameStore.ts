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
  Season,
} from "../game/types";
import {
  defaultHomeTeam,
  defaultAwayTeam,
  defaultGameSettings,
  createDefaultSeason,
  makeOpponentTeam,
  computeTeamOverall,
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

  // ---- Season / Head Coach mode ----
  /** Active season (null when not in season mode). */
  season: Season | null;
  /** Whether the current in-progress game belongs to a season or is a standalone exhibition. */
  gameContext: "exhibition" | "season";
  /** Start a new default season and navigate to the season hub. */
  startSeason: () => void;
  /** Launch the next scheduled season game in the 3D engine. */
  playSeasonGame: () => void;
  /** Instantly resolve the next scheduled season game without 3D rendering. */
  simulateSeasonGame: () => void;
  /** Record the result of the just-finished season game and return to the season hub. */
  returnToSeasonHub: () => void;
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

  // Season / Head Coach mode initial state
  season: null,
  gameContext: "exhibition" as "exhibition" | "season",

  // Actions
  startExhibition: () =>
    set({
      screen: "game",
      simStatus: "running",
      gameContext: "exhibition",
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

  // Season / Head Coach mode
  startSeason: () =>
    set({ season: createDefaultSeason(), screen: "season" }),

  playSeasonGame: () =>
    set((state) => {
      const { season } = state;
      if (!season) return state;
      const game = season.schedule[season.currentGameIndex];
      if (!game || game.result !== null) return state;

      const opponentTeam = makeOpponentTeam(game.opponent);

      return {
        homeTeam: season.team,
        awayTeam: opponentTeam,
        settings: { ...defaultGameSettings, homeCourtBonus: game.isHome },
        screen: "game" as Screen,
        simStatus: "running" as SimStatus,
        gameContext: "season" as "exhibition" | "season",
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
          team: "home" as const,
          ballHandlerId: season.team.lineup[0],
        },
        simPlayers: [],
        ballPosition: { x: 0, y: 0 },
        ballHeight: 3.5,
        shotInFlight: false,
      };
    }),

  simulateSeasonGame: () =>
    set((state) => {
      const { season } = state;
      if (!season) return state;
      const idx = season.currentGameIndex;
      const game = season.schedule[idx];
      if (!game || game.result !== null) return state;

      // Quick statistical sim based on relative team quality
      const userOverall = computeTeamOverall(season.team);
      const baseline = 63;
      const spread = 18;
      const userScore = Math.round(
        baseline + (userOverall / 100) * spread + (Math.random() - 0.5) * 14
      );
      const oppScore = Math.round(
        baseline + (game.opponent.overall / 100) * spread + (Math.random() - 0.5) * 14
      );
      const result: "win" | "loss" = userScore > oppScore ? "win" : "loss";

      const newSchedule = season.schedule.map((g, i) =>
        i === idx ? { ...g, result, userScore, opponentScore: oppScore } : g
      );

      return {
        season: {
          ...season,
          schedule: newSchedule,
          record: {
            wins:   season.record.wins   + (result === "win"  ? 1 : 0),
            losses: season.record.losses + (result === "loss" ? 1 : 0),
          },
          currentGameIndex: idx + 1,
        },
      };
    }),

  returnToSeasonHub: () =>
    set((state) => {
      const { season } = state;
      if (!season) {
        return {
          screen: "menu" as Screen,
          simStatus: "idle" as SimStatus,
          isPauseMenuOpen: false,
        };
      }

      // Record the result of the just-played game when returning from the 3D engine
      let updatedSeason = season;
      if (state.gameContext === "season" && state.simStatus === "finished") {
        const idx = season.currentGameIndex;
        const game = season.schedule[idx];
        if (game && game.result === null) {
          // User's team is always homeTeam in playSeasonGame
          const userScore = state.score.home;
          const opponentScore = state.score.away;
          const result: "win" | "loss" = userScore >= opponentScore ? "win" : "loss";

          updatedSeason = {
            ...season,
            schedule: season.schedule.map((g, i) =>
              i === idx ? { ...g, result, userScore, opponentScore } : g
            ),
            record: {
              wins:   season.record.wins   + (result === "win"  ? 1 : 0),
              losses: season.record.losses + (result === "loss" ? 1 : 0),
            },
            currentGameIndex: idx + 1,
          };
        }
      }

      return {
        season:      updatedSeason,
        screen:      "season" as Screen,
        simStatus:   "idle" as SimStatus,
        gameContext: "exhibition" as "exhibition" | "season",
        isPauseMenuOpen: false,
        score:       { home: 0, away: 0 },
        teamFouls:   { home: 0, away: 0 },
        playerStats: {},
        phase:       "PRE_GAME" as MatchPhase,
        overtimePeriod: 0,
        latestEvents: [],
        gameClock: {
          remaining: defaultGameSettings.halfLength,
          half:      1,
          running:   false,
        },
        shotClock: {
          remaining: defaultGameSettings.shotClockLength,
          running:   false,
        },
        possession:  { team: "home" as const, ballHandlerId: null },
        simPlayers:  [],
        ballPosition: { x: 0, y: 0 },
        ballHeight:  0,
        shotInFlight: false,
      };
    }),
}));
