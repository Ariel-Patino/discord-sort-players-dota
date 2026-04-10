import type { ChatInputCommandInteraction } from 'discord.js';
import GoCommand from '@src/factory/commands/game/GoCommand';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { createCommandMessageAdapter } from './createCommandMessageAdapter';

export async function onGoCommand(
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

  const command = new GoCommand('/go', createCommandMessageAdapter(interaction, '/go'));
  await command.execute();

  await interaction.editReply({
    embeds: [
      EmbedFactory.success(
        t('commands.go.title'),
        t('commands.slash.executedInChannel', { command: '/go' })
      ),
    ],
  });
}
