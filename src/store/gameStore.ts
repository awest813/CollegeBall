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
  Prospect,
} from "../game/types";
import {
  defaultHomeTeam,
  defaultAwayTeam,
  defaultGameSettings,
  createDefaultSeason,
  makeOpponentTeam,
  computeTeamOverall,
  generateProspects,
  developAndAdvancePlayer,
  prospectToPlayer,
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
  /**
   * Advance to the next season: graduate seniors, develop returning players, and
   * enter the recruiting screen. Ported from CFHC's `advanceSeason` flow.
   */
  advanceSeason: () => void;

  // ---- Recruiting (off-season) ----
  /** Available incoming-class prospects for the current recruiting cycle. */
  prospects: Prospect[];
  /** Scouting points remaining this off-season (used to reveal prospect ratings). */
  scoutingPoints: number;
  /** Scout a prospect (costs 1 point; reveals true rating). */
  scoutProspect: (prospectId: string) => void;
  /** Offer a scholarship to a prospect. */
  offerProspect: (prospectId: string) => void;
  /**
   * Finish recruiting: commit offered prospects and transition back to season hub
   * with the refreshed roster and a new season schedule.
   */
  finishRecruiting: () => void;
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

  // Recruiting initial state
  prospects: [],
  scoutingPoints: 0,

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
        settings: {
          ...defaultGameSettings,
          homeCourtBonus: game.isHome,
          coachOffense: season.coach.offense,
          coachDefense: season.coach.defense,
        },
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

      // Quick statistical sim based on relative team quality and program prestige.
      // Adapted from CFHC's statistical sim: prestige provides a small home-court
      // advantage and overall quality gap determines score spread.
      const userOverall = computeTeamOverall(season.team);
      const prestigeBonus = game.isHome ? (season.prestige / 100) * 4 : 0;
      const baseline = 63;
      const spread = 18;
      const userScore = Math.round(
        baseline + (userOverall / 100) * spread + prestigeBonus + (Math.random() - 0.5) * 14
      );
      const oppScore = Math.round(
        baseline + (game.opponent.overall / 100) * spread + (Math.random() - 0.5) * 14
      );
      const result: "win" | "loss" = userScore > oppScore ? "win" : "loss";

      const isConfGame = game.gameType === "conf" || game.gameType === "conf-title";

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
          conferenceRecord: isConfGame ? {
            wins:   season.conferenceRecord.wins   + (result === "win"  ? 1 : 0),
            losses: season.conferenceRecord.losses + (result === "loss" ? 1 : 0),
          } : season.conferenceRecord,
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

          // Merge this game's player stats into the cumulative season stats
          const prevSeasonStats = season.seasonStats ?? {};
          const mergedStats: Record<string, import("../game/types").PlayerGameStats> = { ...prevSeasonStats };
          for (const [playerId, gameStats] of Object.entries(state.playerStats)) {
            const prev = mergedStats[playerId];
            if (!prev) {
              mergedStats[playerId] = { ...gameStats };
            } else {
              mergedStats[playerId] = {
                points:               prev.points               + gameStats.points,
                fieldGoalsMade:       prev.fieldGoalsMade       + gameStats.fieldGoalsMade,
                fieldGoalsAttempted:  prev.fieldGoalsAttempted  + gameStats.fieldGoalsAttempted,
                threesMade:           prev.threesMade           + gameStats.threesMade,
                threesAttempted:      prev.threesAttempted      + gameStats.threesAttempted,
                freeThrowsMade:       prev.freeThrowsMade       + gameStats.freeThrowsMade,
                freeThrowsAttempted:  prev.freeThrowsAttempted  + gameStats.freeThrowsAttempted,
                rebounds:             prev.rebounds             + gameStats.rebounds,
                assists:              prev.assists              + gameStats.assists,
                steals:               prev.steals               + gameStats.steals,
                turnovers:            prev.turnovers            + gameStats.turnovers,
                blocks:               prev.blocks               + gameStats.blocks,
                fouls:                prev.fouls                + gameStats.fouls,
                minutesPlayed:        prev.minutesPlayed        + gameStats.minutesPlayed,
              };
            }
          }

          updatedSeason = {
            ...season,
            schedule: season.schedule.map((g, i) =>
              i === idx ? { ...g, result, userScore, opponentScore } : g
            ),
            record: {
              wins:   season.record.wins   + (result === "win"  ? 1 : 0),
              losses: season.record.losses + (result === "loss" ? 1 : 0),
            },
            conferenceRecord: (game.gameType === "conf" || game.gameType === "conf-title") ? {
              wins:   season.conferenceRecord.wins   + (result === "win"  ? 1 : 0),
              losses: season.conferenceRecord.losses + (result === "loss" ? 1 : 0),
            } : season.conferenceRecord,
            currentGameIndex: idx + 1,
            seasonStats: mergedStats,
            gamesPlayedWithStats: (season.gamesPlayedWithStats ?? 0) + 1,
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

  // ---------------------------------------------------------------------------
  // Season advancement + recruiting (ported from CFHC's off-season flow)
  // ---------------------------------------------------------------------------

  /**
   * Advance to the next season:
   *  1. Graduate all seniors (year = 4) from the roster.
   *  2. Apply development gains to all returning players (year 1–3) using the
   *     coach's development rating — mirrors CFHC's `advanceSeason` logic.
   *  3. Adjust program prestige based on win %.
   *  4. Generate a fresh incoming-class prospect pool sized to fill open spots.
   *  5. Navigate to the recruiting screen.
   */
  advanceSeason: () =>
    set((state) => {
      const { season } = state;
      if (!season) return state;

      const { coach, team, record } = season;
      const totalGames = record.wins + record.losses;
      const winPct = totalGames > 0 ? record.wins / totalGames : 0;

      // 1 & 2: Develop and advance players; seniors return null (graduated)
      const returnees = team.roster
        .map((p) => developAndAdvancePlayer(p, coach.development))
        .filter((p): p is NonNullable<typeof p> => p !== null);

      const graduatedCount = team.roster.length - returnees.length;
      const openSpots = Math.max(graduatedCount, 3); // always recruit at least 3

      // 3: Update prestige — wins above .500 raise it, losses lower it
      const prestigeDelta = Math.round((winPct - 0.5) * 10);
      const newPrestige = Math.max(30, Math.min(99, season.prestige + prestigeDelta));

      // 4: Generate prospects. Scouting points scale with coach's recruiting rating.
      const prospectCount = openSpots + 12; // extra pool to give player options
      const newProspects = generateProspects(newPrestige, coach.recruiting, prospectCount);
      const scoutingPoints = Math.max(3, Math.round(coach.recruiting / 15));

      // Update lineup to only include returnees (trim if needed)
      const returneeIds = new Set(returnees.map((p) => p.id));
      const newLineup = team.lineup
        .filter((id) => returneeIds.has(id))
        .slice(0, 5) as import("../game/types").Lineup;

      const updatedTeam = { ...team, roster: returnees, lineup: newLineup };

      return {
        season: {
          ...season,
          team: updatedTeam,
          year: season.year + 1,
          prestige: newPrestige,
        },
        prospects: newProspects,
        scoutingPoints,
        screen: "recruiting" as Screen,
      };
    }),

  // ---- Recruiting actions ----

  scoutProspect: (prospectId: string) =>
    set((state) => {
      if (state.scoutingPoints <= 0) return state;
      return {
        prospects: state.prospects.map((p) =>
          p.id === prospectId ? { ...p, scouted: true } : p
        ),
        scoutingPoints: state.scoutingPoints - 1,
      };
    }),

  offerProspect: (prospectId: string) =>
    set((state) => {
      const prospect = state.prospects.find((p) => p.id === prospectId);
      if (!prospect || prospect.offered) return state;

      // Prospect commits based on interest level
      const committed = Math.random() < prospect.interestLevel;
      return {
        prospects: state.prospects.map((p) =>
          p.id === prospectId ? { ...p, offered: true, committed } : p
        ),
      };
    }),

  /**
   * Finish recruiting: add committed prospects to the team roster, create a new
   * season schedule, and navigate back to the season hub.
   */
  finishRecruiting: () =>
    set((state) => {
      const { season, prospects } = state;
      if (!season) return state;

      const committed = prospects.filter((p) => p.committed);
      const roster = [...season.team.roster];

      // Assign jersey numbers to incoming freshmen (avoid collisions)
      const usedNumbers = new Set(roster.map((p) => p.number));
      let nextNum = 1;
      const getNum = (): number => {
        while (usedNumbers.has(nextNum)) nextNum++;
        usedNumbers.add(nextNum);
        return nextNum++;
      };

      for (const prospect of committed) {
        roster.push(prospectToPlayer(prospect, getNum()));
      }

      // Rebuild lineup: keep existing valid starters, then fill from new additions
      const existingLineupIds = new Set(season.team.lineup);
      const starters = season.team.lineup.filter((id) =>
        roster.some((p) => p.id === id)
      );
      const benchPool = roster.filter((p) => !existingLineupIds.has(p.id));
      const newLineup = [
        ...starters,
        ...benchPool.map((p) => p.id),
      ].slice(0, 5) as import("../game/types").Lineup;

      const updatedTeam = { ...season.team, roster, lineup: newLineup };

      // Build a fresh 13-game schedule from the default template, preserving
      // the current season's year, prestige, coach, and team.
      const templateSchedule = createDefaultSeason().schedule;

      return {
        season: {
          ...season,
          team: updatedTeam,
          schedule: templateSchedule,
          record: { wins: 0, losses: 0 },
          conferenceRecord: { wins: 0, losses: 0 },
          currentGameIndex: 0,
          seasonStats: {},
          gamesPlayedWithStats: 0,
        },
        prospects: [],
        scoutingPoints: 0,
        screen: "season" as Screen,
      };
    }),
}));
