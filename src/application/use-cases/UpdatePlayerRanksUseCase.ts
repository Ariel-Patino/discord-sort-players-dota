import { appConfig } from '@src/config/app-config';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import { ValidationError } from '@src/shared/errors';

export interface UpdatePlayerRanksInput {
  playerIds: string[];
  rankInput: string | number;
}

export interface UpdatedPlayerRank {
  playerId: string;
  previousRank: number;
  rank: number;
  delta: number;
}

export default class UpdatePlayerRanksUseCase {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async execute(input: UpdatePlayerRanksInput): Promise<UpdatedPlayerRank[]> {
    if (!input.playerIds.length) {
      throw new ValidationError(
        'Select at least one player before saving the rank update.',
        'Choose the players you want to update and try again.'
      );
    }

    const normalizedRank = this.parseAndNormalizeRank(input.rankInput);
    const existingPlayers = await this.playerRepository.getAll();
    const currentRanksByPlayerId = new Map(
      existingPlayers.map((player) => [player.id, Number(player.rank ?? 0)])
    );

    await Promise.all(
      input.playerIds.map((playerId) =>
        this.playerRepository.updateRank(playerId, normalizedRank)
      )
    );

    return input.playerIds.map((playerId) => ({
      playerId,
      previousRank: Number((currentRanksByPlayerId.get(playerId) ?? 0).toFixed(2)),
      rank: normalizedRank,
      delta: Number((normalizedRank - (currentRanksByPlayerId.get(playerId) ?? 0)).toFixed(2)),
    }));
  }

  parseAndNormalizeRank(rawInput: string | number): number {
    const rawRank =
      typeof rawInput === 'number'
        ? rawInput
        : Number.parseFloat(rawInput.trim().replace(',', '.'));

    if (!Number.isFinite(rawRank)) {
      throw new ValidationError(
        'Enter a valid rank value before saving.',
        `Use a numeric value between ${appConfig.rank.min.toFixed(2)} and ${appConfig.rank.max.toFixed(2)} (example: 1.55).`
      );
    }

    const normalizedRank = Math.round(rawRank / appConfig.rank.precisionStep) * appConfig.rank.precisionStep;

    if (normalizedRank < appConfig.rank.min || normalizedRank > appConfig.rank.max) {
      throw new ValidationError(
        `The rank must stay between ${appConfig.rank.min.toFixed(2)} and ${appConfig.rank.max.toFixed(2)}.`,
        'Enter a value within the allowed range and try again.'
      );
    }

    return Number(normalizedRank.toFixed(2));
  }
}
