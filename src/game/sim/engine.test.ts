import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialSimState,
  tick,
  resetSimEngine,
} from "./engine";
import type { GameSettings, Team, Lineup, PlayerPosition } from "../types";

const tinySettings: GameSettings = {
  halfLength: 3,
  shotClockLength: 30,
  bonusFoulThreshold: 7,
  doubleBonusThreshold: 10,
  subStaminaThreshold: 25,
  homeCourtBonus: true,
};

function makeTeam(
  id: string,
  name: string,
  lineupIds: string[],
  positions?: PlayerPosition[]
): Team {
  const roster = lineupIds.map((pid, i) => ({
    id: pid,
    firstName: "Test",
    lastName: `Player${i}`,
    number: i + 1,
    position: positions?.[i] ?? "PG",
    ratings: {
      speed: 60,
      shooting: 60,
      passing: 60,
      defense: 60,
      rebounding: 60,
      endurance: 60,
    },
  }));
  return {
    id,
    name,
    abbreviation: id.slice(0, 3).toUpperCase(),
    primaryColor: "#fff",
    secondaryColor: "#000",
    roster,
    lineup: lineupIds as Lineup,
  };
}

describe("createInitialSimState", () => {
  beforeEach(() => resetSimEngine());

  it("places five per side, home has ball, and starts in warmup", () => {
    const h = ["h1", "h2", "h3", "h4", "h5"];
    const a = ["a1", "a2", "a3", "a4", "a5"];
    const home = makeTeam("home", "Home", h);
    const away = makeTeam("away", "Away", a);

    const s = createInitialSimState(home, away, tinySettings);

    expect(s.players).toHaveLength(10);
    expect(s.players.filter((p) => p.teamId === "home")).toHaveLength(5);
    expect(s.players.filter((p) => p.teamId === "away")).toHaveLength(5);
    expect(s.players.filter((p) => p.hasBall)).toHaveLength(1);
    expect(s.players.find((p) => p.hasBall)?.teamId).toBe("home");
    expect(s.possession.team).toBe("home");
    expect(s.possession.ballHandlerId).toBe(h[0]);
    expect(s.gameClock.half).toBe(1);
    expect(s.gameClock.running).toBe(false);
    expect(s.shotClock.running).toBe(false);
    expect(s.phase).toBe("PRE_GAME");
    expect(Object.keys(s.playerStats)).toHaveLength(10);
  });

  it("assigns floor slot indices from roster positions for spacing and matchups", () => {
    const positions: PlayerPosition[] = ["PG", "SG", "SF", "PF", "C"];
    const ids = ["h1", "h2", "h3", "h4", "h5"];
    const home = makeTeam("home", "Home", ids, positions);
    const away = makeTeam("away", "Away", ["a1", "a2", "a3", "a4", "a5"], positions);

    const s = createInitialSimState(home, away, tinySettings);
    for (let i = 0; i < 5; i++) {
      expect(s.players.find((p) => p.id === ids[i])?.slotIndex).toBe(i);
    }
  });
});

describe("tick — match flow", () => {
  beforeEach(() => resetSimEngine());

  it("progresses through tip-off, halftime, second half, and game end", () => {
    const h = ["h1", "h2", "h3", "h4", "h5"];
    const a = ["a1", "a2", "a3", "a4", "a5"];
    const home = makeTeam("home", "Home", h);
    const away = makeTeam("away", "Away", a);

    let state = createInitialSimState(home, away, tinySettings);
    const dt = 1 / 60;
    let sawTipOff = false;
    let sawHalftime = false;
    let sawSecondHalf = false;
    let sawHalf2 = false;
    let sawInPlay = false;

    for (let i = 0; i < 500_000; i++) {
      state = tick(state, dt, tinySettings);
      if (state.phase === "TIP_OFF") sawTipOff = true;
      if (state.phase === "HALFTIME") sawHalftime = true;
      if (state.phase === "IN_PLAY") sawInPlay = true;
      if (state.phase === "IN_PLAY" && state.gameClock.half === 2) sawSecondHalf = true;
      if (state.gameClock.half === 2) sawHalf2 = true;
      if (state.phase === "FULL_TIME") break;
    }

    expect(sawTipOff).toBe(true);
    expect(sawInPlay).toBe(true);
    expect(sawHalftime).toBe(true);
    expect(sawSecondHalf).toBe(true);
    expect(sawHalf2).toBe(true);
    expect(state.phase).toBe("FULL_TIME");
    expect(state.gameClock.half).toBe(2);
    expect(state.events.some((e) => e.type === "game_end")).toBe(true);
  });

  it("keeps simulation team sides stable even when raw team ids are custom", () => {
    const h = ["h1", "h2", "h3", "h4", "h5"];
    const a = ["a1", "a2", "a3", "a4", "a5"];
    const home = makeTeam("duke-blue", "Home", h);
    const away = makeTeam("carolina-white", "Away", a);

    let state = createInitialSimState(home, away, tinySettings);
    expect(new Set(state.players.map((p) => p.teamId))).toEqual(
      new Set(["home", "away"])
    );

    const dt = 1 / 60;
    for (let i = 0; i < 2_000; i++) {
      state = tick(state, dt, tinySettings);
      if (state.phase === "IN_PLAY") {
        break;
      }
    }

    expect(state.phase).toBe("IN_PLAY");
    expect(state.players.filter((p) => p.teamId === "home")).toHaveLength(5);
    expect(state.players.filter((p) => p.teamId === "away")).toHaveLength(5);
    expect(state.possession.team === "home" || state.possession.team === "away").toBe(true);
  });

  it("transitions to OVERTIME when the game is tied at the end of regulation", () => {
    const h = ["h1", "h2", "h3", "h4", "h5"];
    const a = ["a1", "a2", "a3", "a4", "a5"];
    const home = makeTeam("home", "Home", h);
    const away = makeTeam("away", "Away", a);

    // Fast-forward to 2nd half in play
    let state = createInitialSimState(home, away, tinySettings);
    const dt = 1 / 60;
    for (let i = 0; i < 500_000; i++) {
      state = tick(state, dt, tinySettings);
      if (state.phase === "IN_PLAY" && state.gameClock.half === 2) break;
    }
    expect(state.phase).toBe("IN_PLAY");
    expect(state.gameClock.half).toBe(2);

    // Force a tie and run the clock out
    state = { ...state, score: { home: 42, away: 42 } };
    for (let i = 0; i < 500_000; i++) {
      state = tick(state, dt, tinySettings);
      if (state.phase === "OVERTIME" || state.phase === "FULL_TIME" || state.phase === "FINISHED") break;
    }

    expect(state.phase).toBe("OVERTIME");
    expect(state.overtimePeriod).toBe(1);
    expect(state.events.some((e) => e.type === "overtime_start")).toBe(true);
    expect(state.gameClock.remaining).toBe(5 * 60); // 5-minute OT clock loaded
    expect(state.teamFouls).toEqual({ home: 0, away: 0 }); // fouls reset for OT
  });

  it("initialises overtimePeriod at 0 and exposes _hotStreak in new state", () => {
    const home = makeTeam("home", "Home", ["h1", "h2", "h3", "h4", "h5"]);
    const away = makeTeam("away", "Away", ["a1", "a2", "a3", "a4", "a5"]);
    const state = createInitialSimState(home, away, tinySettings);
    expect(state.overtimePeriod).toBe(0);
    expect(state._hotStreak).toEqual({});
    expect(state._isFastBreak).toBe(false);
  });
});
