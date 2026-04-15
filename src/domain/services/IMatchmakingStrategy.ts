import type { SortResultTeam } from '@src/domain/dto/SortResult';
import type { Player } from '@src/domain/models/Player';
import type { Team } from '@src/domain/models/Team';

export interface MatchConstraint {
  id: string;
  type: 'attribute-proficiency-threshold';
  attribute: string;
  minCount: number;
  minProficiency: number;
  comparison: '>';
  description: string;
}

export interface ConstraintEvaluation {
  constraint: MatchConstraint;
  matchedPlayerIds: string[];
  satisfied: boolean;
  shortage: number;
}

export interface MatchmakingNoiseOptions {
  enabled?: boolean;
  applyChance?: number;
  amplitude?: number;
}

export interface MatchmakingStrategyOptions {
  noise?: MatchmakingNoiseOptions;
  random?: () => number;
  teamCount?: number;
  teamNames?: string[];
}

export interface MatchmakingStrategyResult {
  teams: SortResultTeam[];
  constraints: MatchConstraint[];
}

export interface StrategyAttributeDefinition {
  name: string;
  label: string;
}

export interface IMatchmakingStrategy {
  getStrategyId(): string;
  getDisplayName(): string;
  getAttributeDefinitions(): StrategyAttributeDefinition[];
  getAvailableAttributes(): string[];
  calculateTeamBalance(
    players: Player[],
    options?: MatchmakingStrategyOptions
  ): MatchmakingStrategyResult;
  validateConstraints(
    team: Team,
    options?: { teamSize?: number }
  ): ConstraintEvaluation[];
}