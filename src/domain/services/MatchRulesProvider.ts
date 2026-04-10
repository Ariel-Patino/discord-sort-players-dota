import type { MatchConstraintConfig, MatchRuleConfig } from '@src/config/gameRules';
import { gameRules } from '@src/config/gameRules';
import type { CorePlayerAttributeKey, Player } from '@src/domain/models/Player';

export interface Constraint {
  id: string;
  type: 'attribute-proficiency-threshold';
  attribute: CorePlayerAttributeKey;
  minCount: number;
  minProficiency: number;
  comparison: '>';
  description: string;
}

export interface ConstraintEvaluation {
  constraint: Constraint;
  matchedPlayerIds: string[];
  satisfied: boolean;
  shortage: number;
}

export default class MatchRulesProvider {
  constructor(private readonly rules: MatchRuleConfig[] = gameRules) {}

  getConstraintsForTeamSize(teamSize: number): Constraint[] {
    const resolvedTeamSize = Math.max(1, Math.floor(teamSize));
    const matchedRule = this.resolveRule(resolvedTeamSize);

    return (
      matchedRule?.constraints.map((constraint, index) =>
        this.toConstraint(matchedRule.id, constraint, index)
      ) ?? []
    );
  }

  evaluateTeam(players: Player[], teamSize: number): ConstraintEvaluation[] {
    const constraints = this.getConstraintsForTeamSize(teamSize);

    return constraints.map((constraint) => {
      const matchedPlayerIds = players
        .filter((player) => this.playerMatchesConstraint(player, constraint))
        .map((player) => player.id);

      return {
        constraint,
        matchedPlayerIds,
        satisfied: matchedPlayerIds.length >= constraint.minCount,
        shortage: Math.max(0, constraint.minCount - matchedPlayerIds.length),
      };
    });
  }

  satisfiesTeamConstraints(players: Player[], teamSize: number): boolean {
    return this.evaluateTeam(players, teamSize).every((result) => result.satisfied);
  }

  private resolveRule(teamSize: number): MatchRuleConfig | undefined {
    return this.rules.find((rule) => {
      const aboveMin = rule.minTeamSize === undefined || teamSize >= rule.minTeamSize;
      const belowMax = rule.maxTeamSize === undefined || teamSize <= rule.maxTeamSize;
      return aboveMin && belowMax;
    });
  }

  private toConstraint(
    ruleId: string,
    constraint: MatchConstraintConfig,
    index: number
  ): Constraint {
    return {
      id: `${ruleId}:${constraint.attribute}:${index + 1}`,
      type: 'attribute-proficiency-threshold',
      attribute: constraint.attribute,
      minCount: constraint.minCount,
      minProficiency: constraint.minProficiency,
      comparison: '>',
      description: `Need at least ${constraint.minCount} ${constraint.attribute} player(s) with >${constraint.minProficiency}% proficiency.`,
    };
  }

  private playerMatchesConstraint(player: Player, constraint: Constraint): boolean {
    const attribute = player.attributes[constraint.attribute];

    return Boolean(attribute?.isActive) && Number(attribute?.proficiency ?? 0) > constraint.minProficiency;
  }
}
