import { describe, expect, it } from '@jest/globals';
import type { RuntimeConfig } from '@src/config';
import { validateRuntimeConfig } from '@src/config';
import { appConfig, type AppConfig, validateAppConfig } from './app-config';

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
