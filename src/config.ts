import dotenv from 'dotenv';

dotenv.config();

const PLACEHOLDER_PATTERN = /^\{.*\}$/;

function readEnv(name: string, fallback?: string): string | undefined {
  const rawValue = process.env[name]?.trim();

  if (!rawValue || PLACEHOLDER_PATTERN.test(rawValue)) {
    return fallback;
  }

  return rawValue;
}

export const config = {
  token: readEnv('TOKEN'),
  dbHost: readEnv('DB_HOST', 'mysql') as string,
  dbPort: Number(readEnv('DB_PORT', '3306')),
  dbUser: readEnv('DB_USER', 'botuser') as string,
  dbPassword: readEnv('DB_PASSWORD', 'botpass') as string,
  dbName: readEnv('DB_NAME', 'game') as string,
  dbTable: readEnv('DB_TABLE', 'players') as string,
};

export function assertRequiredConfig() {
  if (!config.token) {
    throw new Error(
      'Missing TOKEN in .env. Add your Discord bot token before starting the bot.'
    );
  }
}
