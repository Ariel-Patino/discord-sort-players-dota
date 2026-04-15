import type { TeamRoleAssignment } from '@src/domain/dto/SortResult';

export interface TeamAssignment {
  teamId: string;
  teamName: string;
  players: string[];
  score: number;
  roleAssignments?: TeamRoleAssignment[];
}

export interface MatchSession {
  sessionId: string | null;
  teams: TeamAssignment[];
  createdAt: number | null;
}

const DEFAULT_TEAM_DEFINITIONS = [
  { teamId: 'team-1', teamName: 'Team 1' },
  { teamId: 'team-2', teamName: 'Team 2' },
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
    roleAssignments: team.roleAssignments?.map((assignment) => ({
      ...assignment,
    })),
  };
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

export function clearTeams(): void {
  currentMatchSession = {
    sessionId: null,
    teams: [],
    createdAt: null,
  };
}
