export interface RankConfig {
  min: number;
  max: number;
  defaultValue: number;
  precisionStep: number;
}

export interface SortNoisePolicy {
  applyChance: number;
  amplitude: number;
}

export interface InteractionTimeoutConfig {
  moveSelectionMs: number;
}

export interface PaginationConfig {
  setRankPageSize: number;
}

export interface SortHistoryConfig {
  maxEntries: number;
}

export interface SortTeamConfig {
  defaultCount: number;
  minCount: number;
  maxCount: number;
}

export interface ChannelKeywordConfig {
  sentinelKeywords: string[];
  scourgeKeywords: string[];
  lobbyKeywords: string[];
  teamChannelIds: Record<string, string | undefined>;
}

export interface AppConfig {
  rank: RankConfig;
  sort: {
    teams: SortTeamConfig;
    noise: SortNoisePolicy;
    history: SortHistoryConfig;
  };
  interactions: InteractionTimeoutConfig;
  pagination: PaginationConfig;
  channels: ChannelKeywordConfig;
}

function parseTeamChannelIdsJson(
  rawValue: string | undefined
): Record<string, string | undefined> {
  if (!rawValue?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, string | undefined>>(
      (channels, [rawKey, rawChannelId]) => {
        if (typeof rawChannelId !== 'string' || !rawChannelId.trim()) {
          return channels;
        }

        const normalizedKey = /^\d+$/u.test(rawKey)
          ? `team-${rawKey}`
          : rawKey;

        channels[normalizedKey] = rawChannelId.trim();
        return channels;
      },
      {}
    );
  } catch {
    return {};
  }
}

export function readTeamChannelIdsFromEnv(
  env: NodeJS.ProcessEnv = process.env
): Record<string, string | undefined> {
  const discoveredChannels = Object.entries(env).reduce<
    Record<string, string | undefined>
  >((channels, [key, value]) => {
    const match = /^TEAM_(\d+)_CHANNEL_ID$/u.exec(key);

    if (!match || !value?.trim()) {
      return channels;
    }

    channels[`team-${Number(match[1])}`] = value.trim();
    return channels;
  }, {});

  const channelsFromJson = parseTeamChannelIdsJson(env.TEAM_CHANNEL_IDS_JSON);
  const teamOneChannel =
    env.TEAM_A_CHANNEL_ID?.trim() || discoveredChannels['team-1'];
  const teamTwoChannel =
    env.TEAM_B_CHANNEL_ID?.trim() || discoveredChannels['team-2'];

  return {
    ...channelsFromJson,
    ...discoveredChannels,
    ...(teamOneChannel ? { 'team-a': teamOneChannel, 'team-1': teamOneChannel } : {}),
    ...(teamTwoChannel ? { 'team-b': teamTwoChannel, 'team-2': teamTwoChannel } : {}),
  };
}

export const appConfig: AppConfig = {
  rank: {
    min: 0.1,
    max: 10.0,
    defaultValue: 1.5,
    precisionStep: 0.01,
  },
  sort: {
    teams: {
      defaultCount: 2,
      minCount: 2,
      maxCount: 12,
    },
    noise: {
      applyChance: 0.3,
      amplitude: 0.2,
    },
    history: {
      maxEntries: 35,
    },
  },
  interactions: {
    moveSelectionMs: 60_000,
  },
  pagination: {
    setRankPageSize: 25,
  },
  channels: {
    sentinelKeywords: ['sentinel', 'radiant'],
    scourgeKeywords: ['scourge', 'dire'],
    lobbyKeywords: ['lobby'],
    teamChannelIds: readTeamChannelIdsFromEnv(),
  },
};

export function validateAppConfig(config: AppConfig): void {
  const { min, max, defaultValue, precisionStep } = config.rank;
  const { minCount, maxCount, defaultCount } = config.sort.teams;

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    throw new Error('Invalid rank configuration: rank.min must be lower than rank.max.');
  }

  if (defaultValue < min || defaultValue > max) {
    throw new Error(
      'Invalid rank configuration: rank.defaultValue must stay within the configured bounds.'
    );
  }

  if (!Number.isFinite(precisionStep) || precisionStep <= 0) {
    throw new Error(
      'Invalid rank configuration: rank.precisionStep must be greater than zero.'
    );
  }

  if (!Number.isInteger(minCount) || !Number.isInteger(maxCount) || minCount < 2) {
    throw new Error(
      'Invalid sort configuration: sort.teams.minCount must be an integer greater than or equal to 2.'
    );
  }

  if (maxCount < minCount) {
    throw new Error(
      'Invalid sort configuration: sort.teams.maxCount must be greater than or equal to sort.teams.minCount.'
    );
  }

  if (!Number.isInteger(defaultCount) || defaultCount < minCount || defaultCount > maxCount) {
    throw new Error(
      'Invalid sort configuration: sort.teams.defaultCount must stay within the configured team-count range.'
    );
  }
}

validateAppConfig(appConfig);

export function normalizeRank(rawValue: number): number {
  const { min, max, defaultValue, precisionStep } = appConfig.rank;

  if (Number.isNaN(rawValue)) {
    return defaultValue;
  }

  const clamped = Math.max(min, Math.min(max, rawValue));
  return Math.round(clamped / precisionStep) * precisionStep;
}

export function formatRankBounds(): string {
  const { min, max } = appConfig.rank;
  return `${min.toFixed(2)} - ${max.toFixed(2)}`;
}
