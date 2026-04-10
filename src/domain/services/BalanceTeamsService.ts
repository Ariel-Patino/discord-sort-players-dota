import type { SortResultTeam } from '@src/domain/dto/SortResult';
import type { Player } from '@src/domain/models/Player';

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
}

interface RankedPlayer {
  player: Player;
  effectiveRank: number;
}

interface TeamBucket extends SortResultTeam {
  capacity: number;
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
  const shuffledPlayers = shufflePlayers(players, random);
  const rankedPlayers = applyNoise(shuffledPlayers, options.noise, random).sort(
    (left, right) => right.effectiveRank - left.effectiveRank
  );
  const teams = createTeamBuckets(teamCount, players.length, options.teamNames);

  for (const rankedPlayer of rankedPlayers) {
    const targetTeam = selectNextTeam(teams);
    targetTeam.players.push(rankedPlayer.player.id);
    targetTeam.score += rankedPlayer.effectiveRank;
  }

  return teams.map(({ capacity, ...team }) => ({
    ...team,
    players: [...team.players],
    score: team.score,
  }));
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
    capacity: baseCapacity + (index < remainder ? 1 : 0),
  }));
}

function resolveTeamName(index: number, teamNames: string[]): string {
  if (teamNames[index]) {
    return teamNames[index];
  }

  if (index === 0) {
    return 'Sentinel';
  }

  if (index === 1) {
    return 'Scourge';
  }

  return `Team ${index + 1}`;
}

function selectNextTeam(teams: TeamBucket[]): TeamBucket {
  const availableTeams = teams.filter((team) => team.players.length < team.capacity);

  availableTeams.sort(
    (left, right) =>
      left.score - right.score ||
      left.players.length - right.players.length ||
      left.teamId.localeCompare(right.teamId)
  );

  const [selectedTeam] = availableTeams;

  if (!selectedTeam) {
    throw new Error('No available team could be selected for player assignment.');
  }

  return selectedTeam;
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
  const shouldApplyNoise =
    isEnabled && applyChance > 0 && amplitude > 0 && random() < applyChance;

  return players.map((player) => ({
    player,
    effectiveRank:
      player.rank +
      (shouldApplyNoise ? (random() - 0.5) * amplitude : 0),
  }));
}
