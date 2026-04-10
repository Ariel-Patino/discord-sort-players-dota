import { ChannelType, VoiceChannel } from 'discord.js';
import {
  buildBulkMoveComponents,
  buildBulkMovePrompt,
} from '@src/components/move-ui';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { saveBulkMoveSession } from '@src/state/bulkMoveSessions';
import Command, { type CommandMessage } from '../main/Command';

export default class MoveCommand extends Command {
  constructor(command: string, chatChannel: CommandMessage) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const guild = this.chatChannel.guild;
    const authorId = this.chatChannel.author.id;

    const connectedMembers = guild.members.cache
      .filter((member) => member.voice.channel)
      .map((member) => ({
        label: member.displayName,
        value: member.id,
        description: member.voice.channel?.name,
      }));

    if (connectedMembers.length === 0) {
      await this.chatChannel.channel.send({
        embeds: [EmbedFactory.warning(undefined, t('errors.noConnectedUsers'))],
      });
      return;
    }

    const voiceChannels = guild.channels.cache
      .filter(
        (channel): channel is VoiceChannel =>
          channel.type === ChannelType.GuildVoice
      )
      .map((channel) => ({
        label: channel.name,
        value: channel.id,
      }));

    if (voiceChannels.length === 0) {
      await this.chatChannel.channel.send({
        embeds: [EmbedFactory.warning(undefined, t('errors.missingTeamChannels'))],
      });
      return;
    }

    const session = saveBulkMoveSession({
      id: `move-${Date.now()}-${Math.floor(Math.random() * 100_000)}`,
      ownerId: authorId,
      guildId: guild.id,
      members: connectedMembers,
      channels: voiceChannels,
      selectedMemberIds: [],
      selectedChannelId: null,
      createdAt: Date.now(),
    });

    await this.chatChannel.channel.send({
      embeds: [
        EmbedFactory.info(
          t('commands.move.title'),
          buildBulkMovePrompt(session)
        ),
      ],
      components: buildBulkMoveComponents(session),
    });
  }
}
