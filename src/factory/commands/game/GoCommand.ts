import {
  ChannelType,
  PermissionFlagsBits,
  type GuildMember,
  type VoiceChannel,
} from 'discord.js';
import { appConfig } from '@src/config/app-config';
import Logger from '@src/infrastructure/logging/Logger';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { ConfigurationError, VoiceOperationError } from '@src/shared/errors';
import { clearSortHistory } from '@src/store/sortHistory';
import { clearTeams, getMatchSession, type TeamAssignment } from '@src/state/teams';
import Command, { type CommandMessage } from '../main/Command';

export default class GoCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const session = getMatchSession();

    if (!session.teams.length || session.teams.every((team) => team.players.length === 0)) {
      await this.chatChannel.channel.send({
        embeds: [EmbedFactory.warning(undefined, t('errors.sortRequiredBeforeGo'))],
      });
      return;
    }

    const guild = this.chatChannel.guild;
    const issues: string[] = [];

    for (const team of session.teams) {
      const targetChannel = this.resolveTeamChannel(team);

      if (!targetChannel) {
        const error = new ConfigurationError(
          t('errors.missingTeamChannelId', {
            teamName: team.teamName,
            teamId: team.teamId,
          }),
          'Set the destination channel ID in the environment or guild configuration, then run `!go` again.'
        );
        Logger.warn('Missing team channel configuration for deployment.', {
          commandName: this.command,
          guildId: guild.id,
          userId: this.chatChannel.author.id,
          errorType: error.name,
          metadata: {
            teamId: team.teamId,
            teamName: team.teamName,
          },
        });
        issues.push(error.message);
        continue;
      }

      const channel = guild.channels.cache.get(targetChannel);

      if (!channel || channel.type !== ChannelType.GuildVoice) {
        const error = new ConfigurationError(
          t('errors.invalidTeamChannelId', {
            teamName: team.teamName,
          }),
          'Check that the configured channel ID points to an existing voice channel.'
        );
        Logger.warn('Configured team channel could not be resolved to a voice channel.', {
          commandName: this.command,
          guildId: guild.id,
          userId: this.chatChannel.author.id,
          errorType: error.name,
          metadata: {
            teamId: team.teamId,
            targetChannel,
          },
        });
        issues.push(error.message);
        continue;
      }

      const botMember = guild.members.me;

      if (!botMember) {
        const error = new VoiceOperationError(
          t('errors.genericUnknown'),
          'Reconnect the bot to the server and try the deployment again.'
        );
        Logger.error('Bot member was unavailable during team deployment.', {
          commandName: this.command,
          guildId: guild.id,
          userId: this.chatChannel.author.id,
          errorType: error.name,
          metadata: {
            teamId: team.teamId,
          },
        });
        issues.push(error.message);
        continue;
      }

      const permissions = channel.permissionsFor(botMember);

      if (
        !permissions?.has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.MoveMembers,
        ])
      ) {
        const error = new VoiceOperationError(
          t('errors.missingMovePermissions', {
            channel: channel.name,
          }),
          'Grant the bot permission to view, connect, and move members in that voice channel.'
        );
        Logger.warn('Bot lacks permissions to deploy players into a voice channel.', {
          commandName: this.command,
          guildId: guild.id,
          userId: this.chatChannel.author.id,
          errorType: error.name,
          metadata: {
            channelId: channel.id,
            channelName: channel.name,
          },
        });
        issues.push(error.message);
        continue;
      }

      const moveErrors = await this.moveTeamMembers(team, channel, guild.members.cache);
      issues.push(...moveErrors);
    }

    if (issues.length > 0) {
      await this.chatChannel.channel.send({
        embeds: [EmbedFactory.error(t('commands.go.title'), issues.join('\n'))],
      });
      return;
    }

    clearTeams();
    clearSortHistory();

    await this.chatChannel.channel.send({
      embeds: [
        EmbedFactory.success(t('commands.go.title'), t('commands.go.success')),
      ],
    });
  }

  private resolveTeamChannel(team: TeamAssignment): string | undefined {
    return appConfig.channels.teamChannelIds[team.teamId];
  }

  private async moveTeamMembers(
    team: TeamAssignment,
    channel: VoiceChannel,
    members: ReadonlyMap<string, GuildMember>
  ): Promise<string[]> {
    const moveErrors: string[] = [];

    for (const playerId of team.players) {
      const member = Array.from(members.values()).find(
        (guildMember) => guildMember.user.username === playerId
      );

      if (!member || !member.voice.channel) {
        Logger.warn('Skipped player deployment because the member is not connected to voice.', {
          commandName: this.command,
          guildId: this.chatChannel.guild.id,
          userId: this.chatChannel.author.id,
          metadata: {
            playerId,
            targetChannel: channel.name,
          },
        });
        continue;
      }

      try {
        await member.voice.setChannel(channel);
      } catch (error) {
        Logger.fromError('Failed to move a guild member into the configured voice channel.', error, {
          commandName: this.command,
          guildId: this.chatChannel.guild.id,
          userId: this.chatChannel.author.id,
          metadata: {
            playerId,
            memberId: member.id,
            channelId: channel.id,
            channelName: channel.name,
          },
        });
        const moveError = new VoiceOperationError(
          t('errors.memberMoveFailed', {
            player: member.displayName,
            channel: channel.name,
          }),
          'Verify the member is still connected and that the bot has Move Members permission.'
        );
        moveErrors.push(moveError.message);
      }
    }

    return moveErrors;
  }
}
