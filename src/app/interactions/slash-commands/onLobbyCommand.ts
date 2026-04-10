import type { ChatInputCommandInteraction } from 'discord.js';
import RegroupCommand from '@src/factory/commands/game/RegroupCommand';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { createCommandMessageAdapter } from './createCommandMessageAdapter';

export async function onLobbyCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.inGuild()) {
    await interaction.reply({
      embeds: [EmbedFactory.error(undefined, t('errors.guildOnlyInteraction'))],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const command = new RegroupCommand(
    '/lobby',
    createCommandMessageAdapter(interaction, '/lobby')
  );
  await command.execute();

  await interaction.editReply({
    embeds: [
      EmbedFactory.success(
        t('commands.lobby.title'),
        t('commands.slash.executedInChannel', { command: '/lobby' })
      ),
    ],
  });
}
