export interface MatchConstraintConfig {
  attribute: string;
  minCount: number;
  minProficiency: number;
}

export interface MatchRuleConfig {
  id: string;
  minTeamSize?: number;
  maxTeamSize?: number;
  constraints: MatchConstraintConfig[];
}
