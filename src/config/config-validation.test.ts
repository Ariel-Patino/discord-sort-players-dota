import { describe, expect, it } from '@jest/globals';
import type { RuntimeConfig } from '@src/config';
import { validateRuntimeConfig } from '@src/config';
import {
  appConfig,
  readTeamChannelIdsFromEnv,
  type AppConfig,
  validateAppConfig,
} from './app-config';
import {
  availableMatchmakingStrategyIds,
  createConfiguredMatchmakingStrategy,
  readMatchmakingStrategyIdFromEnv,
} from './matchmaking-strategy';

const baseRuntimeConfig: RuntimeConfig = {
  token: 'token-value',
  discordApplicationId: 'application-id',
  discordGuildId: 'guild-id',
  dbHost: 'mysql',
  dbPort: 3306,
  dbUser: 'botuser',
  dbPassword: 'botpass',
  dbName: 'game',
  dbTable: 'players',
  dbConnectionLimit: 10,
};

describe('validateAppConfig', () => {
  it('rejects invalid rank bounds', () => {
    const invalidConfig: AppConfig = {
      ...appConfig,
      rank: {
        ...appConfig.rank,
        min: 10,
        max: 1,
      },
    };

    expect(() => validateAppConfig(invalidConfig)).toThrow(
      'Invalid rank configuration: rank.min must be lower than rank.max.'
    );
  });

  it('rejects a default rank outside the allowed bounds', () => {
    const invalidConfig: AppConfig = {
      ...appConfig,
      rank: {
        ...appConfig.rank,
        defaultValue: 20,
      },
    };

    expect(() => validateAppConfig(invalidConfig)).toThrow(
      'Invalid rank configuration: rank.defaultValue must stay within the configured bounds.'
    );
  });

  it('rejects a default team count outside the configured range', () => {
    const invalidConfig: AppConfig = {
      ...appConfig,
      sort: {
        ...appConfig.sort,
        teams: {
          ...appConfig.sort.teams,
          defaultCount: appConfig.sort.teams.maxCount + 1,
        },
      },
    };

    expect(() => validateAppConfig(invalidConfig)).toThrow(
      'Invalid sort configuration: sort.teams.defaultCount must stay within the configured team-count range.'
    );
  });
});

describe('readTeamChannelIdsFromEnv', () => {
  it('reads numbered team channel ids and JSON-based mappings', () => {
    const channels = readTeamChannelIdsFromEnv({
      TEAM_1_CHANNEL_ID: '111',
      TEAM_3_CHANNEL_ID: '333',
      TEAM_CHANNEL_IDS_JSON: '{"team-2":"222","4":"444"}',
    });

    expect(channels['team-1']).toBe('111');
    expect(channels['team-2']).toBe('222');
    expect(channels['team-3']).toBe('333');
    expect(channels['team-4']).toBe('444');
  });

  it('does not expose deprecated team aliases', () => {
    const channels = readTeamChannelIdsFromEnv({
      TEAM_1_CHANNEL_ID: '111',
      TEAM_2_CHANNEL_ID: '222',
      TEAM_A_CHANNEL_ID: 'aaa',
      TEAM_B_CHANNEL_ID: 'bbb',
    });

    expect(channels['team-1']).toBe('111');
    expect(channels['team-2']).toBe('222');
    expect(channels['team-a']).toBeUndefined();
    expect(channels['team-b']).toBeUndefined();
  });
});

describe('matchmaking strategy configuration', () => {
  it('defaults to the dota1 strategy when the environment variable is missing', () => {
    expect(readMatchmakingStrategyIdFromEnv({})).toBe('dota1');
    expect(createConfiguredMatchmakingStrategy({}).getStrategyId()).toBe('dota1');
  });

  it('loads the configured strategy id from the environment', () => {
    const strategy = createConfiguredMatchmakingStrategy({
      MATCHMAKING_STRATEGY: 'dota1',
    });

    expect(strategy.getStrategyId()).toBe('dota1');
    expect(strategy.getDisplayName()).toBe('Dota 1 Matchmaking');
    expect(strategy.getAttributeDefinitions().map((attribute) => attribute.label)).toEqual([
      'Carry',
      'Support',
      'Tank',
    ]);
  });

  it('rejects unknown strategy ids with a useful error', () => {
    expect(() =>
      createConfiguredMatchmakingStrategy({
        MATCHMAKING_STRATEGY: 'unknown-game',
      })
    ).toThrow(
      `Unknown MATCHMAKING_STRATEGY \"unknown-game\". Available strategies: ${availableMatchmakingStrategyIds.join(', ')}.`
    );
  });
});

describe('validateRuntimeConfig', () => {
  it('rejects startup when the bot token is missing', () => {
    expect(() =>
      validateRuntimeConfig(
        {
          ...baseRuntimeConfig,
          token: undefined,
        },
        { requireToken: true }
      )
    ).toThrow('Missing TOKEN in .env. Add your Discord bot token before starting the bot.');
  });

  it('rejects slash publishing when the application id is missing', () => {
    expect(() =>
      validateRuntimeConfig(
        {
          ...baseRuntimeConfig,
          discordApplicationId: undefined,
        },
        {
          requireToken: true,
          requireApplicationId: true,
        }
      )
    ).toThrow(
      'Missing DISCORD_APPLICATION_ID (or CLIENT_ID) in .env. Add it before publishing slash commands.'
    );
  });
});
