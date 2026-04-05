/**
 * Default data used to bootstrap a new exhibition game.
 * In the future these could come from a database, save file, or recruiting system.
 */

import type {
  Team,
  Player,
  PlayerPosition,
  GameSettings,
  Lineup,
} from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _nextId = 1;
const uid = (): string => `player_${_nextId++}`;

/** Return a random integer in [min, max]. */
function rand(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Per-position rating ranges (min, max) for each skill dimension.
 * Guards are faster with better passing; bigs have more rebounding and defense.
 */
const RATING_RANGES: Record<PlayerPosition, Record<keyof import("../types").PlayerRatings, [number, number]>> = {
  PG: { speed: [65, 92], shooting: [55, 85], passing: [68, 90], defense: [50, 78], rebounding: [35, 62], endurance: [60, 90] },
  SG: { speed: [60, 88], shooting: [62, 92], passing: [52, 80], defense: [50, 80], rebounding: [38, 66], endurance: [55, 85] },
  SF: { speed: [56, 85], shooting: [58, 88], passing: [50, 78], defense: [55, 83], rebounding: [48, 76], endurance: [52, 82] },
  PF: { speed: [44, 74], shooting: [44, 76], passing: [36, 66], defense: [60, 88], rebounding: [65, 90], endurance: [48, 78] },
  C:  { speed: [35, 65], shooting: [38, 72], passing: [32, 62], defense: [62, 90], rebounding: [70, 92], endurance: [45, 75] },
};

function makeRatings(pos: PlayerPosition): import("../types").PlayerRatings {
  const r = RATING_RANGES[pos];
  return {
    speed:      rand(...r.speed),
    shooting:   rand(...r.shooting),
    passing:    rand(...r.passing),
    defense:    rand(...r.defense),
    rebounding: rand(...r.rebounding),
    endurance:  rand(...r.endurance),
  };
}

function makePlayers(
  _teamId: string,
  names: [string, string, PlayerPosition, number][]
): Player[] {
  return names.map(([first, last, pos, num]) => ({
    id: uid(),
    firstName: first,
    lastName: last,
    number: num,
    position: pos,
    ratings: makeRatings(pos),
  }));
}

// ---------------------------------------------------------------------------
// Default teams
// ---------------------------------------------------------------------------

const homePlayers = makePlayers("home", [
  ["Marcus", "Johnson", "PG", 1],
  ["Jaylen", "Williams", "SG", 2],
  ["DeAndre", "Smith", "SF", 3],
  ["Tyler", "Brown", "PF", 4],
  ["Chris", "Davis", "C", 5],
  ["Malik", "Thompson", "PG", 11],
  ["Andre", "Wilson", "SG", 12],
  ["Devon", "Taylor", "SF", 13],
]);

const awayPlayers = makePlayers("away", [
  ["Jordan", "Carter", "PG", 1],
  ["Isaiah", "Harris", "SG", 2],
  ["Caleb", "Martin", "SF", 3],
  ["Darius", "Clark", "PF", 4],
  ["Elijah", "Walker", "C", 5],
  ["Terrance", "Lee", "PG", 11],
  ["Noah", "Young", "SG", 12],
  ["Jaden", "Allen", "SF", 13],
]);

export const defaultHomeTeam: Team = {
  id: "home",
  name: "State Bulldogs",
  abbreviation: "STB",
  primaryColor: "#1e40af", // blue
  secondaryColor: "#ffffff",
  roster: homePlayers,
  lineup: homePlayers.slice(0, 5).map((p) => p.id) as Lineup,
};

export const defaultAwayTeam: Team = {
  id: "away",
  name: "Central Tigers",
  abbreviation: "CTG",
  primaryColor: "#b91c1c", // red
  secondaryColor: "#fbbf24",
  roster: awayPlayers,
  lineup: awayPlayers.slice(0, 5).map((p) => p.id) as Lineup,
};

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

export const defaultGameSettings: GameSettings = {
  halfLength: 20 * 60, // 20 minutes per half
  shotClockLength: 30, // NCAA men's shot clock
  bonusFoulThreshold: 7, // one-and-one starts at 7 team fouls
  doubleBonusThreshold: 10, // double bonus at 10 team fouls
  subStaminaThreshold: 25, // sub out players below 25% stamina
  homeCourtBonus: true, // home team receives a small shooting/FT advantage
};
