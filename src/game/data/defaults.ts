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
  Coach,
  SeasonOpponent,
  SeasonGame,
  Season,
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

// ---------------------------------------------------------------------------
// Head Coach & Season Mode data
// ---------------------------------------------------------------------------

export const defaultCoach: Coach = {
  id: "coach_default",
  firstName: "Mike",
  lastName: "Reynolds",
  offense: 72,
  defense: 68,
  recruiting: 65,
  development: 70,
};

/** Ten opponents that make up a default season schedule. */
const SEASON_OPPONENTS: SeasonOpponent[] = [
  { id: "opp_1",  name: "Riverside Hawks",   abbreviation: "RVH", primaryColor: "#7c3aed", secondaryColor: "#ffffff", overall: 68 },
  { id: "opp_2",  name: "Eastwood Eagles",   abbreviation: "EWE", primaryColor: "#0369a1", secondaryColor: "#fbbf24", overall: 72 },
  { id: "opp_3",  name: "Summit Wolves",     abbreviation: "SMW", primaryColor: "#047857", secondaryColor: "#ffffff", overall: 76 },
  { id: "opp_4",  name: "Lakeview Lions",    abbreviation: "LVL", primaryColor: "#b45309", secondaryColor: "#ffffff", overall: 71 },
  { id: "opp_5",  name: "Northgate Rams",    abbreviation: "NGR", primaryColor: "#be123c", secondaryColor: "#f1f5f9", overall: 80 },
  { id: "opp_6",  name: "Crestwood Cougars", abbreviation: "CWC", primaryColor: "#0f766e", secondaryColor: "#ffffff", overall: 74 },
  { id: "opp_7",  name: "Valley Falcons",    abbreviation: "VLF", primaryColor: "#6d28d9", secondaryColor: "#fbbf24", overall: 78 },
  { id: "opp_8",  name: "Hillside Spartans", abbreviation: "HLS", primaryColor: "#1e3a8a", secondaryColor: "#e2e8f0", overall: 69 },
  { id: "opp_9",  name: "Westbrook Bears",   abbreviation: "WBB", primaryColor: "#92400e", secondaryColor: "#ffffff", overall: 83 },
  { id: "opp_10", name: "Pinewood Panthers", abbreviation: "PWP", primaryColor: "#1f2937", secondaryColor: "#10b981", overall: 65 },
];

/** Name pools for generating opponent rosters. */
const OPP_FIRST_NAMES = [
  "Marcus", "Jordan", "Anthony", "Kevin", "James", "Michael", "David",
  "Ryan", "Justin", "Brandon", "Darius", "Isaiah", "Caleb", "Noah", "Jaden",
];
const OPP_LAST_NAMES = [
  "Johnson", "Williams", "Brown", "Davis", "Carter", "Harris", "Martin",
  "Clark", "Walker", "Thompson", "Wilson", "Taylor", "Lee", "Young", "Allen",
];

/**
 * Generate player ratings scaled to an opponent's overall quality.
 * `overall` of 60 produces near-minimum ratings; 90 produces near-maximum.
 */
function makeScaledRatings(pos: PlayerPosition, overall: number): import("../types").PlayerRatings {
  const factor = Math.max(0, Math.min(1, (overall - 60) / 30));
  const r = RATING_RANGES[pos];
  const pick = (range: [number, number]): number => {
    const lo = range[0];
    const hi = range[1];
    const center = lo + (hi - lo) * factor;
    const spread = (hi - lo) * 0.25;
    return Math.round(Math.max(lo, Math.min(hi, center + (Math.random() - 0.5) * spread * 2)));
  };
  return {
    speed:      pick(r.speed),
    shooting:   pick(r.shooting),
    passing:    pick(r.passing),
    defense:    pick(r.defense),
    rebounding: pick(r.rebounding),
    endurance:  pick(r.endurance),
  };
}

/**
 * Generate a full Team for a season opponent.
 * Called just before the game starts so ratings are freshly randomised.
 */
export function makeOpponentTeam(opponent: SeasonOpponent): Team {
  const slots: [PlayerPosition, number][] = [
    ["PG", 1], ["SG", 2], ["SF", 3], ["PF", 4], ["C", 5],
    ["PG", 11], ["SG", 12], ["SF", 13],
  ];

  const usedFirst = new Set<string>();
  const usedLast  = new Set<string>();

  const pickName = (pool: string[], used: Set<string>): string => {
    const available = pool.filter((n) => !used.has(n));
    const source = available.length > 0 ? available : pool;
    const name = source[Math.floor(Math.random() * source.length)];
    used.add(name);
    return name;
  };

  const players: Player[] = slots.map(([pos, num]) => ({
    id: uid(),
    firstName: pickName(OPP_FIRST_NAMES, usedFirst),
    lastName:  pickName(OPP_LAST_NAMES,  usedLast),
    number:    num,
    position:  pos,
    ratings:   makeScaledRatings(pos, opponent.overall),
  }));

  return {
    id:             opponent.id,
    name:           opponent.name,
    abbreviation:   opponent.abbreviation,
    primaryColor:   opponent.primaryColor,
    secondaryColor: opponent.secondaryColor,
    roster:         players,
    lineup:         players.slice(0, 5).map((p) => p.id) as Lineup,
  };
}

/** Compute a single composite overall rating for a team (0–100). */
export function computeTeamOverall(team: Team): number {
  const n = team.roster.length || 1;
  const sum = team.roster.reduce((acc, p) => {
    const { speed, shooting, passing, defense, rebounding } = p.ratings;
    return acc + (speed + shooting + passing + defense + rebounding) / 5;
  }, 0);
  return Math.round(sum / n);
}

/** Build a fresh 10-game default season. */
export function createDefaultSeason(): Season {
  const schedule: SeasonGame[] = SEASON_OPPONENTS.map((opp, i) => ({
    id:           `game_${i + 1}`,
    week:         i + 1,
    isHome:       i % 2 === 0, // alternate home / away
    opponent:     opp,
    result:       null,
    userScore:    null,
    opponentScore: null,
  }));

  return {
    year:              2025,
    coach:             defaultCoach,
    team:              { ...defaultHomeTeam, roster: [...defaultHomeTeam.roster] },
    schedule,
    record:            { wins: 0, losses: 0 },
    currentGameIndex:  0,
  };
}
