import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { appConfig } from '@src/config/app-config';
import {
  buildSetRankComponents,
  buildSetRankPrompt,
} from '@src/components/setrank-ui';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import {
  deleteSetRankSession,
  getSetRankSession,
  isSetRankSessionExpired,
  updateSetRankSession,
} from '@src/state/setRankSessions';

function truncateForModal(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 3))}...`
    : value;
}

export async function onBulkSetRank(
  interaction: ButtonInteraction | StringSelectMenuInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[1];
  const sessionId = parts[2];

  if (!sessionId) {
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

  if (action === 'players' && interaction.isStringSelectMenu()) {
    const page = Number.parseInt(parts[3] ?? '0', 10) || 0;
    const selectedPlayerId = interaction.values[0];
    const updatedSession = updateSetRankSession(sessionId, {
      selectedPlayerIds: selectedPlayerId ? [selectedPlayerId] : [],
      selectedRank: null,
      playerPage: page,
    });

    if (!updatedSession || !selectedPlayerId) {
      await interaction.reply({
        embeds: [EmbedFactory.error(undefined, t('errors.moveFailed'))],
        ephemeral: true,
      });
      return;
    }

    const selectedPlayer = updatedSession.players.find(
      (player) => player.value === selectedPlayerId
    );
    const modalTitle = t('interactions.rank.modalTitleWithPlayer', {
      player: truncateForModal(selectedPlayer?.label ?? selectedPlayerId, 20),
    });
    const rankInput = new TextInputBuilder()
      .setCustomId('rank_value')
      .setLabel(
        t('interactions.rank.inputLabelWithPlayer', {
          player: truncateForModal(selectedPlayer?.label ?? selectedPlayerId, 18),
        })
      )
      .setPlaceholder(t('interactions.rank.inputPlaceholder'))
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const currentRank = selectedPlayer?.description?.replace(/^Current rank:\s*/u, '');
    if (currentRank) {
      rankInput.setValue(currentRank);
    }

    const modal = new ModalBuilder()
      .setCustomId(`setrank:submit:${sessionId}:${selectedPlayerId}`)
      .setTitle(modalTitle)
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(rankInput)
      );

    await interaction.showModal(modal);
    return;
  }

  if (action === 'players-page' && interaction.isButton()) {
    const direction = parts[3];
    const nextPage = direction === 'next'
      ? session.playerPage + 1
      : Math.max(0, session.playerPage - 1);
    const updatedSession = updateSetRankSession(sessionId, {
      playerPage: nextPage,
    });

    if (!updatedSession) {
      await interaction.reply({
        embeds: [EmbedFactory.error(undefined, t('errors.moveFailed'))],
        ephemeral: true,
      });
      return;
    }

    await interaction.update({
      embeds: [
        EmbedFactory.info(
          t('commands.rank.selectionTitle'),
          buildSetRankPrompt(updatedSession)
        ),
      ],
      components: buildSetRankComponents(updatedSession),
    });
    return;
  }

}
