import type { CorePlayerAttributeKey } from '@src/domain/models/Player';

export interface MatchConstraintConfig {
  attribute: CorePlayerAttributeKey;
  minCount: number;
  minProficiency: number;
}

export interface MatchRuleConfig {
  id: string;
  minTeamSize?: number;
  maxTeamSize?: number;
  constraints: MatchConstraintConfig[];
}

export const gameRules: MatchRuleConfig[] = [
  {
    id: 'rank-only-small-teams',
    maxTeamSize: 3,
    constraints: [],
  },
  {
    id: '4v4-role-requirements',
    minTeamSize: 4,
    maxTeamSize: 4,
    constraints: [
      {
        attribute: 'carry',
        minCount: 1,
        minProficiency: 80,
      },
      {
        attribute: 'support',
        minCount: 1,
        minProficiency: 80,
      },
    ],
  },
  {
    id: '5v5-role-requirements',
    minTeamSize: 5,
    constraints: [
      {
        attribute: 'carry',
        minCount: 1,
        minProficiency: 60,
      },
      {
        attribute: 'tank',
        minCount: 1,
        minProficiency: 60,
      },
      {
        attribute: 'support',
        minCount: 1,
        minProficiency: 60,
      },
    ],
  },
];
