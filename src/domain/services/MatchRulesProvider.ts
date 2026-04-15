import type { MatchConstraintConfig, MatchRuleConfig } from '@src/config/gameRules';
import { balancePlayersIntoTeams } from '@src/domain/services/BalanceTeamsService';
import type { Player } from '@src/domain/models/Player';
import type { Team } from '@src/domain/models/Team';
import type {
  ConstraintEvaluation,
  IMatchmakingStrategy,
  MatchConstraint,
  MatchmakingStrategyOptions,
  MatchmakingStrategyResult,
  StrategyAttributeDefinition,
} from './IMatchmakingStrategy';

interface RuleBasedStrategyMetadata {
  strategyId?: string;
  displayName?: string;
  attributeLabels?: Record<string, string>;
}

export default class MatchRulesProvider implements IMatchmakingStrategy {
  constructor(
    private readonly rules: MatchRuleConfig[],
    private readonly metadata: RuleBasedStrategyMetadata = {}
  ) {}

  getStrategyId(): string {
    return this.metadata.strategyId ?? 'rule-based';
  }

  getDisplayName(): string {
    return this.metadata.displayName ?? 'Rule-Based Matchmaking';
  }

  getAttributeDefinitions(): StrategyAttributeDefinition[] {
    return this.getAvailableAttributes().map((name) => ({
      name,
      label: this.resolveAttributeLabel(name),
    }));
  }

  getAvailableAttributes(): string[] {
    return [...new Set(
      this.rules.flatMap((rule) => rule.constraints.map((constraint) => constraint.attribute))
    )].sort((left, right) => left.localeCompare(right));
  }

  calculateTeamBalance(
    players: Player[],
    options: MatchmakingStrategyOptions = {}
  ): MatchmakingStrategyResult {
    const teamCount = Math.max(1, Math.floor(options.teamCount ?? 2));
    const teamSize = Math.max(1, Math.floor(players.length / teamCount));
    const constraints = this.getConstraintsForTeamSize(teamSize);
    const teams = balancePlayersIntoTeams(players, {
      noise: options.noise,
      random: options.random,
      teamCount,
      teamNames: options.teamNames,
      constraints,
    });

    return {
      teams,
      constraints,
    };
  }

  getConstraintsForTeamSize(teamSize: number): MatchConstraint[] {
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

  validateConstraints(
    team: Team,
    options: { teamSize?: number } = {}
  ): ConstraintEvaluation[] {
    const teamSize = options.teamSize ?? team.players.length;
    return this.evaluateTeam(team.players, teamSize);
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
  ): MatchConstraint {
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

  private playerMatchesConstraint(player: Player, constraint: MatchConstraint): boolean {
    const attributeValue = Number(player.attributes[constraint.attribute] ?? 0);

    return attributeValue > constraint.minProficiency;
  }

  private resolveAttributeLabel(attributeName: string): string {
    return this.metadata.attributeLabels?.[attributeName] ??
      attributeName.charAt(0).toUpperCase() + attributeName.slice(1);
  }
}
