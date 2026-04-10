import { ChannelType, type Guild } from 'discord.js';
import { appConfig } from '@src/config/app-config';

export function getFallbackTeamLabel(index: number): string {
  return `Team ${index + 1}`;
}

export async function resolveVoiceChannelTeamLabels(
  guild: Guild,
  teamCount: number
): Promise<string[]> {
  return Promise.all(
    Array.from({ length: teamCount }, async (_value, index) => {
      const teamId = `team-${index + 1}`;
      const fallbackLabel = getFallbackTeamLabel(index);
      const configuredChannelId = appConfig.channels.teamChannelIds[teamId];

      if (!configuredChannelId) {
        return fallbackLabel;
      }

      const cachedChannel = guild.channels.cache.get(configuredChannelId);
      const channel =
        cachedChannel ??
        (await guild.channels.fetch(configuredChannelId).catch(() => null));

      if (channel?.type !== ChannelType.GuildVoice) {
        return fallbackLabel;
      }

      return channel.name;
    })
  );
}
