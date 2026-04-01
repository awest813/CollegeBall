import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialSimState,
  tick,
  resetSimEngine,
} from "./engine";
import type { GameSettings, Team, Lineup } from "../types";

const tinySettings: GameSettings = {
  halfLength: 3,
  shotClockLength: 30,
  bonusFoulThreshold: 7,
  doubleBonusThreshold: 10,
  subStaminaThreshold: 25,
};

function makeTeam(
  id: string,
  name: string,
  lineupIds: string[]
): Team {
  const roster = lineupIds.map((pid, i) => ({
    id: pid,
    firstName: "Test",
    lastName: `Player${i}`,
    number: i + 1,
    position: "PG" as const,
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

  it("places five per side, home has ball, clocks running", () => {
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
    expect(s.gameClock.running).toBe(true);
    expect(s.shotClock.running).toBe(true);
    expect(Object.keys(s.playerStats)).toHaveLength(10);
  });
});

describe("tick — match flow", () => {
  beforeEach(() => resetSimEngine());

  it("reaches second half then ends the game", () => {
    const h = ["h1", "h2", "h3", "h4", "h5"];
    const a = ["a1", "a2", "a3", "a4", "a5"];
    const home = makeTeam("home", "Home", h);
    const away = makeTeam("away", "Away", a);

    let state = createInitialSimState(home, away, tinySettings);
    const dt = 1 / 60;
    let sawHalf2 = false;

    for (let i = 0; i < 500_000; i++) {
      state = tick(state, dt, tinySettings);
      if (state.gameClock.half === 2) sawHalf2 = true;
      if (!state.gameClock.running) break;
    }

    expect(sawHalf2).toBe(true);
    expect(state.gameClock.running).toBe(false);
    expect(state.gameClock.half).toBe(2);
    expect(state.events.some((e) => e.type === "game_end")).toBe(true);
  });
});
