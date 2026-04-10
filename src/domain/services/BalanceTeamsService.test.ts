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

  it('rejects a team count larger than the number of players', () => {
    expect(() =>
      balancePlayersIntoTeams(createPlayers([10, 9, 8]), {
        teamCount: 4,
        random: () => 0.25,
      })
    ).toThrow('At least one player per team is required to generate a balanced match.');
  });
});
