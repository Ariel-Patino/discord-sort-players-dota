import { describe, expect, it } from '@jest/globals';
import {
  createDefaultPlayerAttributes,
  type Player,
} from '@src/domain/models/Player';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import { ValidationError } from '@src/shared/errors';
import UpdatePlayerRanksUseCase from './UpdatePlayerRanksUseCase';

class InMemoryPlayerRepository implements PlayerRepository {
  constructor(private readonly players: Player[]) {}

  async save(player: Player): Promise<Player> {
    this.players.push(player);
    return player;
  }

  async getById(id: string): Promise<Player | null> {
    return this.players.find((player) => player.id === id) ?? null;
  }

  async getAll(): Promise<Player[]> {
    return [...this.players];
  }

  async updateRank(id: string, rank: number): Promise<void> {
    const player = this.players.find((entry) => entry.id === id);

    if (player) {
      player.rank = rank;
    }
  }
}

describe('UpdatePlayerRanksUseCase', () => {
  it('updates a selected player and returns the previous/new delta summary', async () => {
    const repository = new InMemoryPlayerRepository([
      {
        id: 'alice',
        externalId: '1',
        displayName: 'Alice',
        rank: 1.2,
        attributes: createDefaultPlayerAttributes(),
      },
    ]);
    const useCase = new UpdatePlayerRanksUseCase(repository);

    const [result] = await useCase.execute({
      playerIds: ['alice'],
      rankInput: '1.555',
    });

    expect(result.previousRank).toBe(1.2);
    expect(result.rank).toBe(1.56);
    expect(result.delta).toBe(0.36);
    expect((await repository.getById('alice'))?.rank).toBe(1.56);
  });

  it('accepts numeric strings with comma separators and normalizes them', () => {
    const repository = new InMemoryPlayerRepository([]);
    const useCase = new UpdatePlayerRanksUseCase(repository);

    expect(useCase.parseAndNormalizeRank('2,345')).toBe(2.35);
  });

  it('rejects invalid or out-of-range rank input', () => {
    const repository = new InMemoryPlayerRepository([]);
    const useCase = new UpdatePlayerRanksUseCase(repository);

    expect(() => useCase.parseAndNormalizeRank('abc')).toThrow(ValidationError);
    expect(() => useCase.parseAndNormalizeRank('15.0')).toThrow(ValidationError);
  });
});
