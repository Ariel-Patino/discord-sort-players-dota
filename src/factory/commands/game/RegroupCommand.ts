import { ChannelType, GuildMember, VoiceChannel } from 'discord.js';
import { appConfig } from '@src/config/app-config';
import Logger from '@src/infrastructure/logging/Logger';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import Command, { type CommandMessage } from '../main/Command';

const matchesLobbyChannel = (channelName: string): boolean => {
  const normalizedName = channelName.toLowerCase().trim();
  return appConfig.channels.lobbyKeywords.some((keyword) =>
    normalizedName.includes(keyword)
  );
};

export default class RegroupCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const guild = this.chatChannel.guild;

    const targetChannel = guild.channels.cache.find(
      (channel): channel is VoiceChannel =>
        channel.type === ChannelType.GuildVoice &&
        matchesLobbyChannel(channel.name)
    );

    if (!targetChannel) {
      Logger.warn('Lobby voice channel could not be resolved from the configured keywords.', {
        commandName: this.command,
        guildId: guild.id,
        userId: this.chatChannel.author.id,
        errorType: 'ConfigurationWarning',
        metadata: {
          lobbyKeywords: appConfig.channels.lobbyKeywords,
        },
      });

      await this.chatChannel.channel.send({
        embeds: [EmbedFactory.error(undefined, t('errors.missingLobbyChannel'))],
      });
      return;
    }

    const allMembers: GuildMember[] = [];

    guild.channels.cache.forEach((channel) => {
      if (
        channel.type === ChannelType.GuildVoice &&
        channel.id !== targetChannel.id
      ) {
        const voiceChannel = channel as VoiceChannel;
        allMembers.push(...voiceChannel.members.values());
      }
    });

    if (allMembers.length === 0) {
      await this.chatChannel.channel.send({
        embeds: [EmbedFactory.info(undefined, t('errors.noPlayersToRegroup'))],
      });
      return;
    }

    for (const member of allMembers) {
      try {
        await member.voice.setChannel(targetChannel);
      } catch (error) {
        Logger.fromError('Failed to move a guild member back to the lobby channel.', error, {
          commandName: this.command,
          guildId: guild.id,
          userId: this.chatChannel.author.id,
          metadata: {
            channelId: targetChannel.id,
            channelName: targetChannel.name,
            memberId: member.id,
            memberName: member.user.username,
          },
        });
      }
    }

    await this.chatChannel.channel.send({
      embeds: [
        EmbedFactory.success(
          t('commands.lobby.title'),
          t('commands.lobby.success', { channel: targetChannel.name })
        ),
      ],
    });
  }
}
