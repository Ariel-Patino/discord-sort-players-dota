import { describe, expect, it } from '@jest/globals';
import type { Player } from '@src/domain/models/Player';
import { balancePlayersIntoTeams } from './BalanceTeamsService';

function createPlayers(ranks: number[]): Player[] {
  return ranks.map((rank, index) => ({
    id: `player-${index + 1}`,
    externalId: `discord-${index + 1}`,
    displayName: `Player ${index + 1}`,
    rank,
  }));
}

function scoreSpread(scores: number[]): number {
  return Math.max(...scores) - Math.min(...scores);
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

  it('rejects a team count larger than the number of players', () => {
    expect(() =>
      balancePlayersIntoTeams(createPlayers([10, 9, 8]), {
        teamCount: 4,
        random: () => 0.25,
      })
    ).toThrow('At least one player per team is required to generate a balanced match.');
  });
});
