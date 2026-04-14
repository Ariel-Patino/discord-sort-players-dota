import type { SortResult } from '@src/domain/dto/SortResult';
import type { Player } from '@src/domain/models/Player';
import { activeMatchmakingStrategy } from '@src/config/matchmaking-strategy';
import type {
  IMatchmakingStrategy,
  MatchmakingNoiseOptions,
  MatchmakingStrategyOptions,
} from '@src/domain/services/IMatchmakingStrategy';

export interface SortPlayersUseCaseOptions extends MatchmakingStrategyOptions {
  sessionIdFactory?: () => string;
}

export default class SortPlayersUseCase {
  constructor(
    private readonly matchmakingStrategy: IMatchmakingStrategy =
      activeMatchmakingStrategy
  ) {}

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
    const matchmakingResult = this.matchmakingStrategy.calculateTeamBalance(players, {
      noise: options.noise,
      random,
      teamCount: options.teamCount,
      teamNames: options.teamNames,
    });

    return {
      sessionId: sessionIdFactory(),
      createdAt,
      teams: matchmakingResult.teams,
      constraints: matchmakingResult.constraints,
    };
  }
}

export type { MatchmakingNoiseOptions as SortNoiseOptions };
