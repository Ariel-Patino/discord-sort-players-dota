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

export interface ChannelKeywordConfig {
  sentinelKeywords: string[];
  scourgeKeywords: string[];
  lobbyKeywords: string[];
  teamChannelIds: Record<string, string | undefined>;
}

export interface AppConfig {
  rank: RankConfig;
  sort: {
    noise: SortNoisePolicy;
    history: SortHistoryConfig;
  };
  interactions: InteractionTimeoutConfig;
  pagination: PaginationConfig;
  channels: ChannelKeywordConfig;
}

export const appConfig: AppConfig = {
  rank: {
    min: 1.0,
    max: 10.0,
    defaultValue: 1.5,
    precisionStep: 0.1,
  },
  sort: {
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
    teamChannelIds: {
      'team-1': process.env.TEAM_1_CHANNEL_ID?.trim() || undefined,
      'team-2': process.env.TEAM_2_CHANNEL_ID?.trim() || undefined,
      'team-a': process.env.TEAM_1_CHANNEL_ID?.trim() || undefined,
      'team-b': process.env.TEAM_2_CHANNEL_ID?.trim() || undefined,
    },
  },
};

export function validateAppConfig(config: AppConfig): void {
  const { min, max, defaultValue, precisionStep } = config.rank;

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
  return `${min.toFixed(1)} - ${max.toFixed(1)}`;
}
