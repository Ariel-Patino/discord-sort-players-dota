import { ButtonInteraction } from 'discord.js';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import MySqlPlayerRepository from '@src/infrastructure/persistence/MySqlPlayerRepository';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { generateSetRankComponents } from '@root/src/components/setrank-ui';

const playerRepository: PlayerRepository = new MySqlPlayerRepository();

export async function onSetRankPageButton(
  interaction: ButtonInteraction
): Promise<void> {
  const [, direction, rawPage, , userId] = interaction.customId.split('_');

  if (interaction.user.id !== userId) {
    await interaction.reply({
      embeds: [EmbedFactory.error(undefined, t('errors.unauthorizedInteraction'))],
      ephemeral: true,
    });
    return;
  }

  const currentPage = Number.parseInt(rawPage, 10);
  const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
  const players = await playerRepository.getAll();
  const { components, content } = await generateSetRankComponents(
    newPage,
    userId,
    players
  );

  await interaction.update({
    embeds: [EmbedFactory.info(t('commands.rank.selectionTitle'), content)],
    components,
  });
}
