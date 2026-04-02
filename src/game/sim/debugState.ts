import type {
  CameraMode,
  GameClock,
  MatchPhase,
  Possession,
  ScoreState,
  ShotClock,
  SimEvent,
  SimPlayer,
  SimStatus,
  Team,
} from "../types";

interface DebugStateInput {
  screen: string;
  simStatus: SimStatus;
  phase: MatchPhase;
  cameraMode: CameraMode;
  score: ScoreState;
  gameClock: GameClock;
  shotClock: ShotClock;
  possession: Possession;
  ballPosition: { x: number; y: number };
  ballHeight: number;
  shotInFlight: boolean;
  simPlayers: SimPlayer[];
  latestEvents: SimEvent[];
  homeTeam: Team;
  awayTeam: Team;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function teamLabel(teamId: "home" | "away", homeTeam: Team, awayTeam: Team): string {
  return teamId === "home" ? homeTeam.abbreviation : awayTeam.abbreviation;
}

export function serializeDebugState(input: DebugStateInput): string {
  const players = [...input.simPlayers]
    .sort((a, b) => {
      if (a.teamId !== b.teamId) {
        return a.teamId === "home" ? -1 : 1;
      }
      return a.jerseyNumber - b.jerseyNumber || a.id.localeCompare(b.id);
    })
    .map((player) => ({
      id: player.id,
      team: player.teamId,
      teamLabel: teamLabel(player.teamId, input.homeTeam, input.awayTeam),
      number: player.jerseyNumber,
      hasBall: player.hasBall,
      position: {
        x: round(player.position.x),
        y: round(player.position.y),
      },
      targetPosition: {
        x: round(player.targetPosition.x),
        y: round(player.targetPosition.y),
      },
      stamina: round(player.stamina),
      fouls: player.fouls,
    }));

  const recentEvents = input.latestEvents.slice(-5).map((event) => ({
    type: event.type,
    teamId: event.teamId,
    playerId: event.playerId ?? null,
    points: event.points ?? 0,
    message: event.message,
  }));

  return JSON.stringify(
    {
      screen: input.screen,
      simStatus: input.simStatus,
      phase: input.phase,
      coordinateSystem: {
        origin: "Court center at midcourt",
        xAxis: "Positive x moves toward the away basket/right side in the base court layout",
        yAxis: "Positive y moves toward the top sideline",
        units: "Feet",
      },
      score: input.score,
      gameClock: {
        remainingSeconds: round(input.gameClock.remaining),
        half: input.gameClock.half,
        running: input.gameClock.running,
      },
      shotClock: {
        remainingSeconds: round(input.shotClock.remaining),
        running: input.shotClock.running,
      },
      possession: {
        team: input.possession.team,
        teamLabel: teamLabel(input.possession.team, input.homeTeam, input.awayTeam),
        ballHandlerId: input.possession.ballHandlerId,
      },
      cameraMode: input.cameraMode,
      ball: {
        x: round(input.ballPosition.x),
        y: round(input.ballPosition.y),
        height: round(input.ballHeight),
        shotInFlight: input.shotInFlight,
      },
      players,
      recentEvents,
    },
    null,
    2
  );
}
