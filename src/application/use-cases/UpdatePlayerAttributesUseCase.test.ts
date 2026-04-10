import { describe, expect, it } from '@jest/globals';
import {
  createDefaultPlayerAttributes,
  type Player,
} from '@src/domain/models/Player';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import { ValidationError } from '@src/shared/errors';
import UpdatePlayerAttributesUseCase from './UpdatePlayerAttributesUseCase';

class InMemoryPlayerRepository implements PlayerRepository {
  constructor(private readonly players: Player[]) {}

  async save(player: Player): Promise<Player> {
    const existingPlayerIndex = this.players.findIndex(
      (entry) => entry.id === player.id
    );

    if (existingPlayerIndex >= 0) {
      this.players[existingPlayerIndex] = player;
    } else {
      this.players.push(player);
    }

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

describe('UpdatePlayerAttributesUseCase', () => {
  it('activates the requested role and stores the normalized proficiency', async () => {
    const repository = new InMemoryPlayerRepository([
      {
        id: 'alice',
        externalId: '1',
        displayName: 'Alice',
        rank: 2.5,
        attributes: createDefaultPlayerAttributes(),
      },
    ]);
    const useCase = new UpdatePlayerAttributesUseCase(repository);

    const result = await useCase.execute({
      playerId: 'alice',
      attributeName: 'carry',
      proficiencyInput: '84.6',
    });

    expect(result.attributeName).toBe('carry');
    expect(result.isActive).toBe(true);
    expect(result.proficiency).toBe(85);
    expect((await repository.getById('alice'))?.attributes.carry).toEqual({
      isActive: true,
      proficiency: 85,
    });
  });

  it('deactivates the tank role when the value is zero', async () => {
    const repository = new InMemoryPlayerRepository([
      {
        id: 'alice',
        externalId: '1',
        displayName: 'Alice',
        rank: 2.5,
        attributes: createDefaultPlayerAttributes(),
      },
    ]);
    const useCase = new UpdatePlayerAttributesUseCase(repository);

    const result = await useCase.execute({
      playerId: 'alice',
      attributeName: 'tank',
      proficiencyInput: 0,
    });

    expect(result.attributeName).toBe('tank');
    expect(result.isActive).toBe(false);
    expect(result.proficiency).toBe(0);
    expect((await repository.getById('alice'))?.attributes.tank).toEqual({
      isActive: false,
      proficiency: 0,
    });
  });

  it('rejects invalid attribute names, missing players, and out-of-range values', async () => {
    const repository = new InMemoryPlayerRepository([]);
    const useCase = new UpdatePlayerAttributesUseCase(repository);

    await expect(
      useCase.execute({
        playerId: 'ghost',
        attributeName: 'carry',
        proficiencyInput: 70,
      })
    ).rejects.toThrow(ValidationError);

    expect(() => useCase.parseAttributeName('@bad-role')).toThrow(ValidationError);
    expect(() => useCase.parseProficiency('101')).toThrow(ValidationError);
  });
});
