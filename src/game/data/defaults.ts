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
    ratings: {
      speed: 50 + Math.floor(Math.random() * 30),
      shooting: 50 + Math.floor(Math.random() * 30),
      passing: 50 + Math.floor(Math.random() * 30),
      defense: 50 + Math.floor(Math.random() * 30),
      rebounding: 50 + Math.floor(Math.random() * 30),
      endurance: 50 + Math.floor(Math.random() * 30),
    },
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
};
