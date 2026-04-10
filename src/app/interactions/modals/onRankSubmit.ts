import { ModalSubmitInteraction } from 'discord.js';
import UpdatePlayerRanksUseCase from '@src/application/use-cases/UpdatePlayerRanksUseCase';
import type { PlayerRepository } from '@src/domain/ports/PlayerRepository';
import MySqlPlayerRepository from '@src/infrastructure/persistence/MySqlPlayerRepository';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { ValidationError } from '@src/shared/errors';
import {
  deleteSetRankSession,
  getSetRankSession,
  isSetRankSessionExpired,
  updateSetRankSession,
} from '@src/state/setRankSessions';

const playerRepository: PlayerRepository = new MySqlPlayerRepository();
const updatePlayerRanksUseCase = new UpdatePlayerRanksUseCase(playerRepository);

export async function onRankSubmit(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const [, action, sessionId, playerId] = interaction.customId.split(':');

  if (action !== 'submit' || !sessionId || !playerId) {
    await interaction.reply({
      embeds: [EmbedFactory.error(undefined, t('errors.moveFailed'))],
      ephemeral: true,
    });
    return;
  }

  const session = getSetRankSession(sessionId);

  if (session && interaction.user.id !== session.ownerId) {
    await interaction.reply({
      embeds: [
        EmbedFactory.warning(
          t('commands.rank.selectionTitle'),
          t('errors.setRankSessionUnauthorized')
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (!session || isSetRankSessionExpired(session)) {
    deleteSetRankSession(sessionId);
    await interaction.reply({
      embeds: [EmbedFactory.warning(undefined, t('errors.setRankSessionExpired'))],
      ephemeral: true,
    });
    return;
  }

  try {
    const [update] = await updatePlayerRanksUseCase.execute({
      playerIds: [playerId],
      rankInput: interaction.fields.getTextInputValue('rank_value').trim(),
    });

    updateSetRankSession(sessionId, {
      selectedPlayerIds: [playerId],
      selectedRank: update.rank,
    });

    const playerLabel =
      session.players.find((player) => player.value === playerId)?.label ?? playerId;
    const changeLabel = `${update.delta >= 0 ? '+' : ''}${update.delta.toFixed(2)}`;

    await interaction.reply({
      embeds: [
        EmbedFactory.success(
          `✅ ${t('commands.rank.updatedTitle')}`,
          [
            `**Player:** ${playerLabel}`,
            `**New rank:** ${update.rank.toFixed(2)}`,
            `**Previous rank:** ${update.previousRank.toFixed(2)}`,
            `**Change:** ${changeLabel}`,
          ].join('\n')
        ),
      ],
      ephemeral: true,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply({
        embeds: [
          EmbedFactory.warning(
            error.message,
            error.nextStep ?? t('errors.invalidRankInputFormat')
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    throw error;
  }
}
