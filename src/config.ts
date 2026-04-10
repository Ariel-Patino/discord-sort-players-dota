import dotenv from 'dotenv';

dotenv.config();

const PLACEHOLDER_PATTERN = /^\{.*\}$/;

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
  table: string;
  connectionLimit: number;
}

export interface RuntimeConfig {
  token?: string;
  discordApplicationId?: string;
  discordGuildId?: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbTable: string;
  dbConnectionLimit: number;
}

function readEnv(name: string, fallback?: string): string | undefined {
  const rawValue = process.env[name]?.trim();

  if (!rawValue || PLACEHOLDER_PATTERN.test(rawValue)) {
    return fallback;
  }

  return rawValue;
}

function readRequiredEnv(name: string, fallback?: string): string {
  const value = readEnv(name, fallback);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readNumberEnv(
  name: string,
  fallback: number,
  options: { min?: number; max?: number } = {}
): number {
  const rawValue = readEnv(name);
  const parsedValue = rawValue ? Number(rawValue) : fallback;

  if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a valid integer.`);
  }

  if (options.min !== undefined && parsedValue < options.min) {
    throw new Error(`Environment variable ${name} must be >= ${options.min}.`);
  }

  if (options.max !== undefined && parsedValue > options.max) {
    throw new Error(`Environment variable ${name} must be <= ${options.max}.`);
  }

  return parsedValue;
}

export const config: Readonly<RuntimeConfig> = {
  token: readEnv('TOKEN'),
  discordApplicationId: readEnv('DISCORD_APPLICATION_ID', readEnv('CLIENT_ID')),
  discordGuildId: readEnv('DISCORD_GUILD_ID', readEnv('GUILD_ID')),
  dbHost: readRequiredEnv('DB_HOST', 'mysql'),
  dbPort: readNumberEnv('DB_PORT', 3306, { min: 1, max: 65535 }),
  dbUser: readRequiredEnv('DB_USER', 'botuser'),
  dbPassword: readRequiredEnv('DB_PASSWORD', 'botpass'),
  dbName: readRequiredEnv('DB_NAME', 'game'),
  dbTable: readRequiredEnv('DB_TABLE', 'players'),
  dbConnectionLimit: readNumberEnv('DB_CONNECTION_LIMIT', 10, {
    min: 1,
    max: 100,
  }),
};

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    name: config.dbName,
    table: config.dbTable,
    connectionLimit: config.dbConnectionLimit,
  };
}

export function validateRuntimeConfig(
  runtimeConfig: RuntimeConfig,
  options: {
    requireToken?: boolean;
    requireApplicationId?: boolean;
  } = {}
): void {
  if (options.requireToken && !runtimeConfig.token) {
    throw new Error(
      'Missing TOKEN in .env. Add your Discord bot token before starting the bot.'
    );
  }

  if (options.requireApplicationId && !runtimeConfig.discordApplicationId) {
    throw new Error(
      'Missing DISCORD_APPLICATION_ID (or CLIENT_ID) in .env. Add it before publishing slash commands.'
    );
  }
}

export function getSlashCommandPublishConfig(): {
  token: string;
  applicationId: string;
  guildId?: string;
} {
  validateRuntimeConfig(config, {
    requireToken: true,
    requireApplicationId: true,
  });

  return {
    token: config.token as string,
    applicationId: config.discordApplicationId as string,
    guildId: config.discordGuildId,
  };
}

export function assertRequiredConfig(): void {
  validateRuntimeConfig(config, {
    requireToken: true,
  });
}
