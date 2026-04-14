import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface SeedPlayerInfo {
  dotaName: string;
  rank: number;
  attributes: Record<string, number>;
}

export type PlayerSeed = Record<string, SeedPlayerInfo>;

const DEFAULT_PLAYER_SEED_FILE = 'seeds/example.players.json';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function resolvePlayerSeedFilePath(
  env: NodeJS.ProcessEnv = process.env
): string {
  const configuredPath = env.PLAYER_SEED_FILE?.trim() || DEFAULT_PLAYER_SEED_FILE;
  return path.resolve(process.cwd(), configuredPath);
}

export async function loadPlayerSeed(
  env: NodeJS.ProcessEnv = process.env
): Promise<{ filePath: string; players: PlayerSeed }> {
  const filePath = resolvePlayerSeedFilePath(env);

  let rawFileContents: string;

  try {
    rawFileContents = await readFile(filePath, 'utf8');
  } catch {
    throw new Error(
      `Unable to read player seed file at "${filePath}". Set PLAYER_SEED_FILE to a valid JSON file path.`
    );
  }

  let parsedContents: unknown;

  try {
    parsedContents = JSON.parse(rawFileContents) as unknown;
  } catch {
    throw new Error(`Player seed file "${filePath}" contains invalid JSON.`);
  }

  if (!isPlainObject(parsedContents)) {
    throw new Error(`Player seed file "${filePath}" must contain a JSON object keyed by player ID.`);
  }

  const players: PlayerSeed = {};

  for (const [playerId, rawPlayer] of Object.entries(parsedContents)) {
    if (!isPlainObject(rawPlayer)) {
      throw new Error(`Seed player "${playerId}" in "${filePath}" must be an object.`);
    }

    const { dotaName, rank, attributes } = rawPlayer;

    if (typeof dotaName !== 'string') {
      throw new Error(`Seed player "${playerId}" in "${filePath}" must define dotaName as a string.`);
    }

    if (typeof rank !== 'number' || !Number.isFinite(rank)) {
      throw new Error(`Seed player "${playerId}" in "${filePath}" must define rank as a finite number.`);
    }

    if (!isPlainObject(attributes)) {
      throw new Error(`Seed player "${playerId}" in "${filePath}" must define attributes as an object.`);
    }

    const normalizedAttributes: Record<string, number> = {};

    for (const [attributeName, rawValue] of Object.entries(attributes)) {
      if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
        throw new Error(
          `Seed player "${playerId}" in "${filePath}" must use numeric values for attribute "${attributeName}".`
        );
      }

      normalizedAttributes[attributeName] = rawValue;
    }

    players[playerId] = {
      dotaName,
      rank,
      attributes: normalizedAttributes,
    };
  }

  return {
    filePath,
    players,
  };
}