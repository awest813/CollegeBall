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
  Prospect,
} from "../types";
import { randomFirstName, randomLastName } from "./names";

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

/**
 * Create a player with ratings scaled to a given overall quality level (60–90).
 * Ported from CFHC's `makeScaledRatings` logic.
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
 * Assign a year (1–4) to a player slot based on its position in the roster.
 * Starters tend to be upperclassmen; bench players are younger.
 * Adapted from CFHC's year-distribution logic.
 */
function assignYear(slotIndex: number): 1 | 2 | 3 | 4 {
  // Slots 0-4: starters — weighted toward 2–4 (So/Jr/Sr)
  // Slots 5+: bench — weighted toward 1–3 (Fr/So/Jr)
  if (slotIndex < 5) {
    const roll = Math.random();
    if (roll < 0.20) return 2;
    if (roll < 0.55) return 3;
    return 4;
  } else {
    const roll = Math.random();
    if (roll < 0.40) return 1;
    if (roll < 0.75) return 2;
    return 3;
  }
}

function makePlayers(
  _teamId: string,
  names: [string, string, PlayerPosition, number][]
): Player[] {
  return names.map(([first, last, pos, num], idx) => ({
    id: uid(),
    firstName: first,
    lastName: last,
    number: num,
    position: pos,
    ratings: makeRatings(pos),
    year: assignYear(idx),
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
  coachOffense: 50, // neutral coach offensive system rating
  coachDefense: 50, // neutral coach defensive system rating
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

/**
 * Conference opponent pool — the eight teams in the user's conference.
 * Adapted from CFHC's conference scheduling system.
 * These teams appear as "Conference" games in the 13-game schedule.
 */
const CONF_OPPONENTS: SeasonOpponent[] = [
  { id: "conf_1", name: "Bridgeport Huskies",  abbreviation: "BPH", primaryColor: "#1e3a8a", secondaryColor: "#f8fafc", overall: 72 },
  { id: "conf_2", name: "Hartford Colonials",  abbreviation: "HTC", primaryColor: "#7c2d12", secondaryColor: "#fef3c7", overall: 76 },
  { id: "conf_3", name: "New Haven Knights",   abbreviation: "NHK", primaryColor: "#064e3b", secondaryColor: "#d1fae5", overall: 74 },
  { id: "conf_4", name: "Providence Friars",   abbreviation: "PRV", primaryColor: "#1c1917", secondaryColor: "#f1f5f9", overall: 79 },
  { id: "conf_5", name: "Kingston Rams",       abbreviation: "KGR", primaryColor: "#7c3aed", secondaryColor: "#ede9fe", overall: 70 },
  { id: "conf_6", name: "Albany Monarchs",     abbreviation: "ALB", primaryColor: "#065f46", secondaryColor: "#d1fae5", overall: 77 },
  { id: "conf_7", name: "Lowell Chargers",     abbreviation: "LWC", primaryColor: "#c2410c", secondaryColor: "#fef3c7", overall: 73 },
  { id: "conf_8", name: "Burlington Bears",    abbreviation: "BLB", primaryColor: "#0369a1", secondaryColor: "#f0f9ff", overall: 68 },
];

/**
 * Generate a full Team for a season opponent.
 * Now uses the CFHC-derived name database for realistic player names.
 */
export function makeOpponentTeam(opponent: SeasonOpponent): Team {
  const slots: [PlayerPosition, number][] = [
    ["PG", 1], ["SG", 2], ["SF", 3], ["PF", 4], ["C", 5],
    ["PG", 11], ["SG", 12], ["SF", 13],
  ];

  const usedFirst = new Set<string>();
  const usedLast  = new Set<string>();

  const pickUniqueName = (used: Set<string>, picker: () => string): string => {
    let name = picker();
    let attempts = 0;
    while (used.has(name) && attempts < 20) {
      name = picker();
      attempts++;
    }
    used.add(name);
    return name;
  };

  const players: Player[] = slots.map(([pos, num], idx) => ({
    id: uid(),
    firstName: pickUniqueName(usedFirst, randomFirstName),
    lastName:  pickUniqueName(usedLast,  randomLastName),
    number:    num,
    position:  pos,
    ratings:   makeScaledRatings(pos, opponent.overall),
    year:      assignYear(idx),
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

/**
 * Build a fresh 13-game season schedule modelled after CFHC's schedule system:
 *   - 4 non-conference games (weeks 1–4, against the "OOC" pool)
 *   - 8 conference games (weeks 5–12, against conf opponents with alternating home/away)
 *   - 1 conference title game (week 13, neutral site vs the best conf opponent)
 *
 * This mirrors CFHC's Conference / OOC / Conference-Championship model.
 */
export function createDefaultSeason(): Season {
  const schedule: SeasonGame[] = [];
  let week = 1;

  // Non-conference games (weeks 1–4)
  const nonConfOpponents = SEASON_OPPONENTS.slice(0, 4);
  nonConfOpponents.forEach((opp, i) => {
    schedule.push({
      id:           `game_nc_${i + 1}`,
      week:         week++,
      isHome:       i % 2 === 0,
      opponent:     opp,
      result:       null,
      userScore:    null,
      opponentScore: null,
      gameType:     "non-conf",
    });
  });

  // Conference games (weeks 5–12)
  CONF_OPPONENTS.forEach((opp, i) => {
    schedule.push({
      id:           `game_conf_${i + 1}`,
      week:         week++,
      isHome:       i % 2 === 0,
      opponent:     opp,
      result:       null,
      userScore:    null,
      opponentScore: null,
      gameType:     "conf",
    });
  });

  // Conference title game (week 13) — vs the strongest conference opponent
  const titleOpponent = [...CONF_OPPONENTS].sort((a, b) => b.overall - a.overall)[0];
  schedule.push({
    id:           "game_conf_title",
    week:         week,
    isHome:       false, // neutral site
    opponent:     titleOpponent,
    result:       null,
    userScore:    null,
    opponentScore: null,
    gameType:     "conf-title",
  });

  return {
    year:              2025,
    coach:             defaultCoach,
    team:              { ...defaultHomeTeam, roster: [...defaultHomeTeam.roster] },
    schedule,
    record:            { wins: 0, losses: 0 },
    conferenceRecord:  { wins: 0, losses: 0 },
    prestige:          60,
    conferenceName:    "Big East",
    currentGameIndex:  0,
    seasonStats:       {},
    gamesPlayedWithStats: 0,
  };
}

// ---------------------------------------------------------------------------
// Recruiting: off-season prospect generation
// ---------------------------------------------------------------------------

const REGIONS = ["West", "Midwest", "East", "South"] as const;
const POSITIONS: PlayerPosition[] = ["PG", "SG", "SF", "PF", "C"];

/**
 * Generate a pool of incoming-class prospects for the off-season recruiting phase.
 *
 * Concept directly ported from CFHC's RecruitingSessionData:
 *  - Prospects are spread across positions and regions
 *  - Ratings are normally distributed with higher-prestige programs seeing more
 *    elite prospects in their pool
 *  - Scouted = false by default; costs a scouting point to reveal true rating
 *  - interestLevel is affected by the program's prestige vs prospect quality
 *
 * @param prestige  Program prestige (0–100) from the Season state
 * @param recruiting  Coach recruiting rating (0–100) from the Coach profile
 * @param count     Number of prospects to generate (default 30)
 */
export function generateProspects(
  prestige: number,
  recruiting: number,
  count = 30
): Prospect[] {
  const prospects: Prospect[] = [];
  const prestigeFactor = prestige / 100;
  const recruitingFactor = recruiting / 100;

  // Positions in proportion similar to a college basketball roster need:
  // PG:SG:SF:PF:C ≈ 2:2:2:2:1 per 9 prospects
  const positionWeights = [2, 2, 2, 2, 1]; // PG SG SF PF C

  for (let i = 0; i < count; i++) {
    // Pick position weighted by need
    const totalWeight = positionWeights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;
    let posIdx = 0;
    for (let j = 0; j < positionWeights.length; j++) {
      roll -= positionWeights[j];
      if (roll <= 0) { posIdx = j; break; }
    }
    const position = POSITIONS[posIdx];

    // Rating: elite prospects (85–95) are rare; most are 55–80
    // Recruiting rating and prestige increase the chance of top prospects appearing
    const eliteChance = 0.05 + prestigeFactor * 0.15 + recruitingFactor * 0.10;
    let rating: number;
    if (Math.random() < eliteChance) {
      rating = rand(84, 96);
    } else {
      rating = rand(52, 83);
    }

    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

    // Interest level: higher prestige = more interest, attenuated by rating mismatch
    const baseInterest = 0.35 + prestigeFactor * 0.40;
    const ratingPenalty = Math.max(0, (rating - 75) / 100) * 0.25;
    const interestLevel = Math.max(0.10, Math.min(0.95, baseInterest - ratingPenalty + (Math.random() - 0.5) * 0.20));

    prospects.push({
      id: `prospect_${Date.now()}_${i}`,
      firstName: randomFirstName(),
      lastName: randomLastName(),
      position,
      rating,
      scouted: false,
      region,
      interestLevel,
      offered: false,
      committed: false,
    });
  }

  // Sort: unsorted by default to simulate a "big board" feel — user must discover order
  return prospects;
}

/**
 * Advance a player's year and apply development gains.
 *
 * Based on CFHC's end-of-season `advanceSeason` logic where players progress
 * through Fr → So → Jr → Sr and receive rating improvements driven by
 * potential and coach development rating.
 *
 * @returns The updated player, or null if the player has graduated (was a Senior).
 */
export function developAndAdvancePlayer(
  player: Player,
  coachDevelopment: number
): Player | null {
  if (player.year === 4) return null; // senior graduates

  const devFactor = coachDevelopment / 100;

  // Improvement is larger for younger players (higher ceiling) and
  // tapered by the development rating — mirrors CFHC's progression model.
  const yearFactor = (4 - player.year) / 3; // 1.0 for Fr→So, 0.33 for Jr→Sr
  const improvementBase = Math.round(yearFactor * devFactor * 6);

  const improve = (val: number): number =>
    Math.min(99, val + improvementBase + Math.round((Math.random() - 0.3) * 3));

  return {
    ...player,
    year: (player.year + 1) as 2 | 3 | 4,
    ratings: {
      speed:      improve(player.ratings.speed),
      shooting:   improve(player.ratings.shooting),
      passing:    improve(player.ratings.passing),
      defense:    improve(player.ratings.defense),
      rebounding: improve(player.ratings.rebounding),
      endurance:  improve(player.ratings.endurance),
    },
  };
}

/**
 * Convert a committed Prospect into a Player ready to join the roster.
 * The new player is a Freshman (year = 1).
 */
export function prospectToPlayer(prospect: Prospect, number: number): Player {
  return {
    id: uid(),
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    number,
    position: prospect.position,
    year: 1,
    ratings: makeScaledRatings(prospect.position, prospect.rating),
  };
}
