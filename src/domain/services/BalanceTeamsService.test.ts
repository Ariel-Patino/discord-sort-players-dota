import { describe, expect, it } from '@jest/globals';
import { type Player } from '@src/domain/models/Player';
import Dota1MatchmakingStrategy from './Dota1MatchmakingStrategy';
import { balancePlayersIntoTeams } from './BalanceTeamsService';

function createPlayers(ranks: number[]): Player[] {
  return ranks.map((rank, index) => ({
    id: `player-${index + 1}`,
    externalId: `discord-${index + 1}`,
    displayName: `Player ${index + 1}`,
    rank,
    attributes: {},
  }));
}

function scoreSpread(scores: number[]): number {
  return Math.max(...scores) - Math.min(...scores);
}

function createRolePlayer(
  id: string,
  rank: number,
  activeFlags: Partial<Record<'support' | 'tank' | 'carry', boolean>> = {},
  proficiencies: Partial<Record<'support' | 'tank' | 'carry', number>> = {}
): Player {
  const attributes: Record<string, number> = {};

  for (const key of ['support', 'tank', 'carry'] as const) {
    attributes[key] = activeFlags[key]
      ? proficiencies[key] ?? 90
      : 0;
  }

  return {
    id,
    externalId: id,
    displayName: id,
    rank,
    attributes,
  };
}

function createTeamPlayers(
  teamPlayerIds: string[],
  playersById: Map<string, Player>
): Player[] {
  return teamPlayerIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player));
}

function createSequenceRandom(values: number[]): () => number {
  let index = 0;

  return () => {
    const value = values[index % values.length] ?? 0.5;
    index += 1;
    return value;
  };
}

describe('balancePlayersIntoTeams', () => {
  it('balances ranks reliably across two teams', () => {
    const teams = balancePlayersIntoTeams(createPlayers([10, 9, 8, 7, 6, 5]), {
      teamCount: 2,
      random: () => 0.25,
    });

    expect(teams).toHaveLength(2);
    expect(teams.map((team) => team.players.length)).toEqual([3, 3]);
    expect(scoreSpread(teams.map((team) => team.score))).toBeLessThanOrEqual(1);
    expect(new Set(teams.flatMap((team) => team.players)).size).toBe(6);
  });

  it('balances ranks across three teams with custom names', () => {
    const teams = balancePlayersIntoTeams(createPlayers([10, 9, 8, 7, 6, 5]), {
      teamCount: 3,
      teamNames: ['Radiant', 'Dire', 'Team 3'],
      random: () => 0.25,
    });

    expect(teams.map((team) => team.teamName)).toEqual(['Radiant', 'Dire', 'Team 3']);
    expect(teams.every((team) => team.players.length === 2)).toBe(true);
    expect(scoreSpread(teams.map((team) => team.score))).toBe(0);
  });

  it('supports any team count without Discord dependencies', () => {
    const teams = balancePlayersIntoTeams(
      createPlayers([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]),
      {
        teamCount: 5,
        random: () => 0.25,
      }
    );

    expect(teams).toHaveLength(5);
    expect(teams.every((team) => team.players.length === 2)).toBe(true);
    expect(scoreSpread(teams.map((team) => team.score))).toBe(0);
  });

  it('produces different balanced team layouts when the random seed changes', () => {
    const players = createPlayers([10, 9, 8, 7, 6, 5]);

    const firstRun = balancePlayersIntoTeams(players, {
      teamCount: 2,
      noise: {
        enabled: true,
        applyChance: 1,
        amplitude: 0.2,
      },
      random: createSequenceRandom([0.1, 0.8, 0.3, 0.7, 0.2, 0.9]),
    });

    const secondRun = balancePlayersIntoTeams(players, {
      teamCount: 2,
      noise: {
        enabled: true,
        applyChance: 1,
        amplitude: 0.2,
      },
      random: createSequenceRandom([0.9, 0.2, 0.8, 0.1, 0.7, 0.3]),
    });

    expect(firstRun.map((team) => team.players)).not.toEqual(
      secondRun.map((team) => team.players)
    );
    expect(scoreSpread(firstRun.map((team) => team.score))).toBeLessThanOrEqual(1);
    expect(scoreSpread(secondRun.map((team) => team.score))).toBeLessThanOrEqual(1);
  });

  it('seeds mandatory role players before greedy balancing when constraints are available', () => {
    const matchRulesProvider = new Dota1MatchmakingStrategy();
    const players = [
      createRolePlayer('carry-a', 9, { carry: true }, { carry: 95 }),
      createRolePlayer('carry-b', 8, { carry: true }, { carry: 91 }),
      createRolePlayer('tank-a', 7, { tank: true }, { tank: 90 }),
      createRolePlayer('tank-b', 6, { tank: true }, { tank: 86 }),
      createRolePlayer('support-a', 5, { support: true }, { support: 92 }),
      createRolePlayer('support-b', 4, { support: true }, { support: 88 }),
      createRolePlayer('flex-1', 3),
      createRolePlayer('flex-2', 3),
      createRolePlayer('flex-3', 2),
      createRolePlayer('flex-4', 2),
    ];
    const playersById = new Map(players.map((player) => [player.id, player]));

    const teams = balancePlayersIntoTeams(players, {
      teamCount: 2,
      constraints: matchRulesProvider.getConstraintsForTeamSize(5),
      random: () => 0.25,
    });

    for (const team of teams) {
      const evaluation = matchRulesProvider.evaluateTeam(
        createTeamPlayers(team.players, playersById),
        5
      );

      expect(evaluation.every((entry) => entry.satisfied)).toBe(true);
      expect(team.roleAssignments?.map((assignment) => assignment.attribute).sort()).toEqual(
        ['carry', 'support', 'tank']
      );
    }
  });

  it('falls back to the next best role players when a threshold cannot be satisfied', () => {
    const matchRulesProvider = new Dota1MatchmakingStrategy();
    const players = [
      createRolePlayer('carry-a', 9, { carry: true }, { carry: 95 }),
      createRolePlayer('carry-b', 8, { carry: true }, { carry: 82 }),
      createRolePlayer('support-a', 7, { support: true }, { support: 79 }),
      createRolePlayer('support-b', 6, { support: true }, { support: 65 }),
      createRolePlayer('flex-1', 5),
      createRolePlayer('flex-2', 4),
      createRolePlayer('flex-3', 3),
      createRolePlayer('flex-4', 2),
    ];
    const playersById = new Map(players.map((player) => [player.id, player]));

    const teams = balancePlayersIntoTeams(players, {
      teamCount: 2,
      constraints: matchRulesProvider.getConstraintsForTeamSize(4),
      random: () => 0.25,
    });

    expect(new Set(teams.flatMap((team) => team.players)).size).toBe(8);

    for (const team of teams) {
      const teamPlayers = createTeamPlayers(team.players, playersById);
      expect(teamPlayers.some((player) => Number(player.attributes.support ?? 0) > 0)).toBe(true);
      expect(matchRulesProvider.satisfiesTeamConstraints(teamPlayers, 4)).toBe(false);
      expect(
        team.roleAssignments?.some(
          (assignment) => assignment.attribute === 'support' && assignment.usedFallback
        )
      ).toBe(true);
    }
  });

  it('rejects a team count larger than the number of players', () => {
    expect(() =>
      balancePlayersIntoTeams(createPlayers([10, 9, 8]), {
        teamCount: 4,
        random: () => 0.25,
      })
    ).toThrow('At least one player per team is required to generate a balanced match.');
  });
});
