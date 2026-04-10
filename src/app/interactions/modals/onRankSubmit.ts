import { ModalSubmitInteraction } from 'discord.js';
import { normalizeRank } from '@src/config/app-config';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import MySqlPlayerRepository from '@src/infrastructure/persistence/MySqlPlayerRepository';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';

const playerRepository: PlayerRepository = new MySqlPlayerRepository();

export async function onRankSubmit(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const selectedId = interaction.customId.split(':')[1];
  const raw = interaction.fields.getTextInputValue('rank_value');
  const rank = normalizeRank(Number.parseFloat(raw));

  await playerRepository.updateRank(selectedId, rank);

  const embed = EmbedFactory.success(
    `✅ ${t('commands.rank.updatedTitle')}`,
    t('commands.rank.updatedDescription', {
      playerId: selectedId,
      rank: rank.toFixed(1),
    })
  );

  await interaction.message?.delete();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}
