import type { Constraint } from '@src/domain/services/MatchRulesProvider';

export interface TeamRoleAssignment {
  playerId: string;
  attribute: Constraint['attribute'];
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
  constraints: Constraint[];
}
