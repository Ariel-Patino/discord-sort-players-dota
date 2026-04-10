import {
  ChannelType,
  ComponentType,
  VoiceChannel,
} from 'discord.js';
import { createMenu, disableRows } from '@src/components/move-ui';
import { appConfig } from '@src/config/app-config';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
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

    const selectUserRow = createMenu(
      'a user to move',
      `move_user_${authorId}`,
      connectedMembers
    );
    const selectChannelRow = createMenu(
      'a channel',
      `move_channel_${authorId}`,
      voiceChannels
    );

    const message = await this.chatChannel.channel.send({
      embeds: [
        EmbedFactory.info(t('commands.move.title'), t('interactions.move.prompt')),
      ],
      components: [selectUserRow, selectChannelRow],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: appConfig.interactions.moveSelectionMs,
    });

    const state: { userId?: string; channelId?: string } = {};

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== authorId) {
        await interaction.reply({
          embeds: [EmbedFactory.error(undefined, t('errors.unauthorizedInteraction'))],
          ephemeral: true,
        });
        return;
      }

      if (interaction.customId === `move_user_${authorId}`) {
        state.userId = interaction.values[0];
      } else if (interaction.customId === `move_channel_${authorId}`) {
        state.channelId = interaction.values[0];
      }

      await interaction.deferUpdate();

      if (state.userId && state.channelId) {
        const member = guild.members.cache.get(state.userId);
        const channel = guild.channels.cache.get(state.channelId);

        if (member && channel?.type === ChannelType.GuildVoice) {
          await member.voice.setChannel(channel);
          await this.chatChannel.channel.send({
            embeds: [
              EmbedFactory.success(
                t('commands.move.title'),
                t('commands.move.success', {
                  member: member.displayName,
                  channel: channel.name,
                })
              ),
            ],
          });
        } else {
          await this.chatChannel.channel.send({
            embeds: [EmbedFactory.error(undefined, t('errors.moveFailed'))],
          });
        }

        collector.stop();
      }
    });

    collector.on('end', async () => {
      await message.edit({
        components: disableRows([selectUserRow, selectChannelRow]),
      });
    });
  }
}
