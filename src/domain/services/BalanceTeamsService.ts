import type {
  SortResultTeam,
  TeamRoleAssignment,
} from '@src/domain/dto/SortResult';
import type { Player } from '@src/domain/models/Player';
import type { MatchConstraint } from './IMatchmakingStrategy';

export interface SortNoiseOptions {
  enabled?: boolean;
  applyChance?: number;
  amplitude?: number;
}

export interface BalanceTeamsOptions {
  noise?: SortNoiseOptions;
  random?: () => number;
  teamCount?: number;
  teamNames?: string[];
  constraints?: MatchConstraint[];
}

interface RankedPlayer {
  player: Player;
  effectiveRank: number;
  randomizedOrder: number;
}

interface ConstraintCandidate {
  rankedPlayer: RankedPlayer;
  usedFallback: boolean;
}

interface TeamBucket extends SortResultTeam {
  capacity: number;
  roleAssignments: TeamRoleAssignment[];
}

export function balancePlayersIntoTeams(
  players: Player[],
  options: BalanceTeamsOptions = {}
): SortResultTeam[] {
  if (players.length === 0) {
    throw new Error('At least one player is required to generate a sort result.');
  }

  const random = options.random ?? Math.random;
  const teamCount = normalizeTeamCount(options.teamCount ?? 2);

  if (players.length < teamCount) {
    throw new Error('At least one player per team is required to generate a balanced match.');
  }

  const shuffledPlayers = shufflePlayers(players, random);
  const rankedPlayers = applyNoise(shuffledPlayers, options.noise, random).sort(
    (left, right) =>
      right.effectiveRank - left.effectiveRank ||
      left.randomizedOrder - right.randomizedOrder
  );
  const teams = createTeamBuckets(teamCount, players.length, options.teamNames);
  const playersById = new Map(rankedPlayers.map((entry) => [entry.player.id, entry.player]));
  const assignedPlayerIds = new Set<string>();

  seedTeamsForConstraints(
    rankedPlayers,
    teams,
    playersById,
    options.constraints ?? [],
    assignedPlayerIds,
    random
  );

  for (const rankedPlayer of rankedPlayers) {
    if (assignedPlayerIds.has(rankedPlayer.player.id)) {
      continue;
    }

    const targetTeam = selectNextTeam(teams, random);
    assignPlayerToTeam(targetTeam, rankedPlayer);
    assignedPlayerIds.add(rankedPlayer.player.id);
  }

  return teams.map(({ capacity, ...team }) => ({
    ...team,
    players: [...team.players],
    score: team.score,
    roleAssignments: team.roleAssignments.map((assignment) => ({
      ...assignment,
    })),
  }));
}

function seedTeamsForConstraints(
  rankedPlayers: RankedPlayer[],
  teams: TeamBucket[],
  playersById: Map<string, Player>,
  constraints: MatchConstraint[],
  assignedPlayerIds: Set<string>,
  random: () => number
): void {
  for (const constraint of constraints) {
    for (let slot = 0; slot < constraint.minCount; slot += 1) {
      const targetTeams = orderTeamsForConstraint(
        teams,
        playersById,
        constraint,
        random
      );

      for (const team of targetTeams) {
        const candidate = selectConstraintCandidate(
          rankedPlayers,
          assignedPlayerIds,
          constraint
        );

        if (!candidate) {
          break;
        }

        assignPlayerToTeam(team, candidate.rankedPlayer);
        recordRoleAssignment(
          team,
          candidate.rankedPlayer.player.id,
          constraint,
          candidate.usedFallback
        );
        assignedPlayerIds.add(candidate.rankedPlayer.player.id);
      }
    }
  }
}

function orderTeamsForConstraint(
  teams: TeamBucket[],
  playersById: Map<string, Player>,
  constraint: MatchConstraint,
  random: () => number
): TeamBucket[] {
  const pendingTeams = teams.filter(
    (team) =>
      team.players.length < team.capacity &&
      countConstraintMatchesInTeam(team, playersById, constraint) <
        constraint.minCount
  );
  const orderedTeams: TeamBucket[] = [];

  while (pendingTeams.length > 0) {
    const nextTeam = selectNextTeam(pendingTeams, random);
    orderedTeams.push(nextTeam);

    const nextIndex = pendingTeams.findIndex(
      (team) => team.teamId === nextTeam.teamId
    );

    if (nextIndex >= 0) {
      pendingTeams.splice(nextIndex, 1);
    }
  }

  return orderedTeams;
}

function countConstraintMatchesInTeam(
  team: TeamBucket,
  playersById: Map<string, Player>,
  constraint: MatchConstraint
): number {
  return team.players.reduce((count, playerId) => {
    const player = playersById.get(playerId);
    return count + (player && playerMatchesConstraint(player, constraint) ? 1 : 0);
  }, 0);
}

function selectConstraintCandidate(
  rankedPlayers: RankedPlayer[],
  assignedPlayerIds: Set<string>,
  constraint: MatchConstraint
): ConstraintCandidate | null {
  let bestQualifiedCandidate: RankedPlayer | null = null;
  let bestFallbackCandidate: RankedPlayer | null = null;

  for (const rankedPlayer of rankedPlayers) {
    if (assignedPlayerIds.has(rankedPlayer.player.id)) {
      continue;
    }

    if (playerMatchesConstraint(rankedPlayer.player, constraint)) {
      if (
        !bestQualifiedCandidate ||
        isBetterConstraintCandidate(
          rankedPlayer,
          bestQualifiedCandidate,
          constraint
        )
      ) {
        bestQualifiedCandidate = rankedPlayer;
      }

      continue;
    }

    if (
      playerCanFallbackForConstraint(rankedPlayer.player, constraint) &&
      (!bestFallbackCandidate ||
        isBetterConstraintCandidate(
          rankedPlayer,
          bestFallbackCandidate,
          constraint
        ))
    ) {
      bestFallbackCandidate = rankedPlayer;
    }
  }

  if (bestQualifiedCandidate) {
    return {
      rankedPlayer: bestQualifiedCandidate,
      usedFallback: false,
    };
  }

  if (bestFallbackCandidate) {
    return {
      rankedPlayer: bestFallbackCandidate,
      usedFallback: true,
    };
  }

  return null;
}

function isBetterConstraintCandidate(
  candidate: RankedPlayer,
  currentBest: RankedPlayer,
  constraint: MatchConstraint
): boolean {
  const candidateProficiency = Number(
    candidate.player.attributes[constraint.attribute] ?? 0
  );
  const currentProficiency = Number(
    currentBest.player.attributes[constraint.attribute] ?? 0
  );

  return (
    candidateProficiency > currentProficiency ||
    (candidateProficiency === currentProficiency &&
      (candidate.effectiveRank > currentBest.effectiveRank ||
        (candidate.effectiveRank === currentBest.effectiveRank &&
          candidate.randomizedOrder < currentBest.randomizedOrder)))
  );
}

function playerMatchesConstraint(player: Player, constraint: MatchConstraint): boolean {
  const attributeValue = Number(player.attributes[constraint.attribute] ?? 0);

  return attributeValue > constraint.minProficiency;
}

function playerCanFallbackForConstraint(
  player: Player,
  constraint: MatchConstraint
): boolean {
  return Number(player.attributes[constraint.attribute] ?? 0) > 0;
}

function assignPlayerToTeam(team: TeamBucket, rankedPlayer: RankedPlayer): void {
  team.players.push(rankedPlayer.player.id);
  team.score += rankedPlayer.effectiveRank;
}

function recordRoleAssignment(
  team: TeamBucket,
  playerId: string,
  constraint: MatchConstraint,
  usedFallback: boolean
): void {
  if (
    team.roleAssignments.some(
      (assignment) =>
        assignment.playerId === playerId &&
        assignment.attribute === constraint.attribute
    )
  ) {
    return;
  }

  team.roleAssignments.push({
    playerId,
    attribute: constraint.attribute,
    constraintId: constraint.id,
    usedFallback,
  });
}

function normalizeTeamCount(teamCount: number): number {
  if (!Number.isFinite(teamCount) || teamCount < 1) {
    throw new Error('The number of teams must be a positive integer.');
  }

  return Math.max(1, Math.floor(teamCount));
}

function createTeamBuckets(
  teamCount: number,
  playerCount: number,
  teamNames: string[] = []
): TeamBucket[] {
  const baseCapacity = Math.floor(playerCount / teamCount);
  const remainder = playerCount % teamCount;

  return Array.from({ length: teamCount }, (_, index) => ({
    teamId: `team-${index + 1}`,
    teamName: resolveTeamName(index, teamNames),
    players: [],
    score: 0,
    roleAssignments: [],
    capacity: baseCapacity + (index < remainder ? 1 : 0),
  }));
}

function resolveTeamName(index: number, teamNames: string[]): string {
  if (teamNames[index]) {
    return teamNames[index];
  }

  return `Team ${index + 1}`;
}

function selectNextTeam(
  teams: TeamBucket[],
  random: () => number
): TeamBucket {
  const availableTeams = teams.filter((team) => team.players.length < team.capacity);

  availableTeams.sort(
    (left, right) =>
      left.score - right.score || left.players.length - right.players.length
  );

  const [selectedTeam] = availableTeams;

  if (!selectedTeam) {
    throw new Error('No available team could be selected for player assignment.');
  }

  const equallyBalancedTeams = availableTeams.filter(
    (team) =>
      team.score === selectedTeam.score &&
      team.players.length === selectedTeam.players.length
  );

  return (
    equallyBalancedTeams[Math.floor(random() * equallyBalancedTeams.length)] ??
    selectedTeam
  );
}

function shufflePlayers(players: Player[], random: () => number): Player[] {
  const shuffled = [...players];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function applyNoise(
  players: Player[],
  noiseOptions: SortNoiseOptions | undefined,
  random: () => number
): RankedPlayer[] {
  const isEnabled = noiseOptions?.enabled ?? false;
  const applyChance = noiseOptions?.applyChance ?? 0;
  const amplitude = noiseOptions?.amplitude ?? 0;

  return players.map((player, index) => {
    const shouldApplyNoise =
      isEnabled && applyChance > 0 && amplitude > 0 && random() < applyChance;

    return {
      player,
      randomizedOrder: index,
      effectiveRank:
        player.rank +
        (shouldApplyNoise ? (random() - 0.5) * amplitude : 0),
    };
  });
}
