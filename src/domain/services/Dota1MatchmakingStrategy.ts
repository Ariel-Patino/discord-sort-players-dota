import type { MatchRuleConfig } from '@src/config/gameRules';
import MatchRulesProvider from './MatchRulesProvider';

const DOTA1_MATCH_RULES: MatchRuleConfig[] = [
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

export default class Dota1MatchmakingStrategy extends MatchRulesProvider {
  constructor() {
    super(DOTA1_MATCH_RULES, {
      strategyId: 'dota1',
      displayName: 'Dota 1 Matchmaking',
      attributeLabels: {
        carry: 'Carry',
        support: 'Support',
        tank: 'Tank',
      },
    });
  }
}