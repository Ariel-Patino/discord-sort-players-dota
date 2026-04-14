import type { IMatchmakingStrategy } from '@src/domain/services/IMatchmakingStrategy';
import Dota1MatchmakingStrategy from '@src/domain/services/Dota1MatchmakingStrategy';

type MatchmakingStrategyFactory = () => IMatchmakingStrategy;

const matchmakingStrategyRegistry: Record<string, MatchmakingStrategyFactory> = {
  dota1: () => new Dota1MatchmakingStrategy(),
};

export const availableMatchmakingStrategyIds = Object.freeze(
  Object.keys(matchmakingStrategyRegistry).sort((left, right) =>
    left.localeCompare(right)
  )
);

export function readMatchmakingStrategyIdFromEnv(
  env: NodeJS.ProcessEnv = process.env
): string {
  return env.MATCHMAKING_STRATEGY?.trim().toLowerCase() || 'dota1';
}

export function createConfiguredMatchmakingStrategy(
  env: NodeJS.ProcessEnv = process.env
): IMatchmakingStrategy {
  const strategyId = readMatchmakingStrategyIdFromEnv(env);
  const factory = matchmakingStrategyRegistry[strategyId];

  if (!factory) {
    throw new Error(
      `Unknown MATCHMAKING_STRATEGY \"${strategyId}\". Available strategies: ${availableMatchmakingStrategyIds.join(', ')}.`
    );
  }

  return factory();
}

export const activeMatchmakingStrategy: IMatchmakingStrategy =
  createConfiguredMatchmakingStrategy();

// To add a new strategy:
// 1. Create a class like `LeagueOfLegendsStrategy` or `ValorantStrategy`
//    implementing `IMatchmakingStrategy`.
// 2. Register it in `matchmakingStrategyRegistry` above.
// 3. Set `MATCHMAKING_STRATEGY=<strategy-id>` in the environment.