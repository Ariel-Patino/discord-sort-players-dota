import type { SortResult } from '@src/domain/dto/SortResult';
import type { Player } from '@src/domain/models/Player';
import {
  balancePlayersIntoTeams,
  type BalanceTeamsOptions,
  type SortNoiseOptions,
} from '@src/domain/services/BalanceTeamsService';

export interface SortPlayersUseCaseOptions extends BalanceTeamsOptions {
  sessionIdFactory?: () => string;
}

export default class SortPlayersUseCase {
  execute(
    players: Player[],
    options: SortPlayersUseCaseOptions = {}
  ): SortResult {
    if (players.length === 0) {
      throw new Error('At least one player is required to generate a sort result.');
    }

    const random = options.random ?? Math.random;
    const createdAt = Date.now();
    const sessionIdFactory =
      options.sessionIdFactory ??
      (() => `sort-${createdAt}-${Math.floor(random() * 1_000_000)}`);
    const teams = balancePlayersIntoTeams(players, {
      noise: options.noise,
      random,
      teamCount: options.teamCount,
      teamNames: options.teamNames,
    });

    return {
      sessionId: sessionIdFactory(),
      createdAt,
      teams,
    };
  }
}

export type { SortNoiseOptions };
