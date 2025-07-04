import Command from '../main/Command';
import { ComponentType, VoiceChannel } from 'discord.js';
import { createMenu, disableRows } from '@src/components/move-ui';

export default class MoveCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  async execute(): Promise<void> {
    const guild = this.chatChannel.guild;
    const authorId = this.chatChannel.author.id;

    const connectedMembers = guild.members.cache
      .filter((m: any) => m.voice.channel)
      .map((m: any) => ({
        label: m.displayName,
        value: m.id,
      }));

    if (connectedMembers.length === 0) {
      await this.chatChannel.channel.send('No users are connected to voice.');
      return;
    }

    const voiceChannels = guild.channels.cache
      .filter((c: any) => c.type === 2)
      .map((c: any) => ({
        label: c.name,
        value: c.id,
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
      content: 'Select a user and a channel to move them:',
      components: [selectUserRow, selectChannelRow],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });

    const state: { userId?: string; channelId?: string } = {};

    collector.on('collect', async (interaction: any) => {
      if (interaction.user.id !== authorId) {
        await interaction.reply({
          content: '❌ U need to have the power to change this.',
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
        const channel = guild.channels.cache.get(
          state.channelId
        ) as VoiceChannel;

        if (member && channel) {
          await member.voice.setChannel(channel);
          await this.chatChannel.channel.send(
            `✅ Moved **${member.displayName}** to **${channel.name}**.`
          );
        } else {
          await this.chatChannel.channel.send(
            `⚠️ Could not complete the move.`
          );
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
