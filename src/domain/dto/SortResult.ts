import type { MatchConstraint } from '@src/domain/services/IMatchmakingStrategy';

export interface TeamRoleAssignment {
  playerId: string;
  attribute: MatchConstraint['attribute'];
  constraintId: string;
  usedFallback: boolean;
}

export interface SortResultTeam {
  teamId: string;
  teamName: string;
  players: string[];
  score: number;
  roleAssignments?: TeamRoleAssignment[];
}

export interface SortResult {
  sessionId: string;
  createdAt: number;
  teams: SortResultTeam[];
  constraints: MatchConstraint[];
}
