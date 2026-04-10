export interface TeamAssignment {
  teamId: string;
  teamName: string;
  players: string[];
  score: number;
}

export interface MatchSession {
  sessionId: string | null;
  teams: TeamAssignment[];
  createdAt: number | null;
}

const DEFAULT_TEAM_DEFINITIONS = [
  { teamId: 'team-1', teamName: 'Sentinel' },
  { teamId: 'team-2', teamName: 'Scourge' },
] as const;

let currentMatchSession: MatchSession = {
  sessionId: null,
  teams: [],
  createdAt: null,
};

function cloneTeamAssignment(team: TeamAssignment): TeamAssignment {
  return {
    ...team,
    players: [...team.players],
  };
}

export function createTeamAssignments(
  team1: string[],
  team2: string[],
  scores: [number, number] = [0, 0]
): TeamAssignment[] {
  return [
    {
      teamId: DEFAULT_TEAM_DEFINITIONS[0].teamId,
      teamName: DEFAULT_TEAM_DEFINITIONS[0].teamName,
      players: [...team1],
      score: scores[0],
    },
    {
      teamId: DEFAULT_TEAM_DEFINITIONS[1].teamId,
      teamName: DEFAULT_TEAM_DEFINITIONS[1].teamName,
      players: [...team2],
      score: scores[1],
    },
  ];
}

export function setMatchSession(session: MatchSession): void {
  currentMatchSession = {
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    teams: session.teams.map(cloneTeamAssignment),
  };
}

export function getMatchSession(): MatchSession {
  return {
    sessionId: currentMatchSession.sessionId,
    createdAt: currentMatchSession.createdAt,
    teams: currentMatchSession.teams.map(cloneTeamAssignment),
  };
}

export function setTeams(team1: string[], team2: string[]): void {
  setMatchSession({
    sessionId: `match-${Date.now()}`,
    createdAt: Date.now(),
    teams: createTeamAssignments(team1, team2),
  });
}

export function getTeams(): { sentinel: string[]; scourge: string[] } {
  const [sentinelTeam, scourgeTeam] = getMatchSession().teams;

  return {
    sentinel: sentinelTeam?.players ?? [],
    scourge: scourgeTeam?.players ?? [],
  };
}

export function clearTeams(): void {
  currentMatchSession = {
    sessionId: null,
    teams: [],
    createdAt: null,
  };
}
