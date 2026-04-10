import type { Interaction } from 'discord.js';
import Logger from '@src/infrastructure/logging/Logger';
import { t } from '@src/localization';
import ErrorPresenter from '@src/presentation/discord/ErrorPresenter';
import EmbedFactory from '@src/presentation/discord/embeds';
import { onBulkMove } from '../interactions/onBulkMove';
import { onBulkSetRank } from '../interactions/onBulkSetRank';
import { onRankSubmit } from '../interactions/modals/onRankSubmit';

export async function handleInteractionCreate(
  interaction: Interaction
): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      Logger.info('Ignored slash command because prefix-only mode is enabled.', {
        commandName: `/${interaction.commandName}`,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        metadata: {
          transport: 'slash',
        },
      });

      await interaction.reply({
        embeds: [EmbedFactory.info(undefined, t('errors.prefixOnlyCommands'))],
        ephemeral: true,
      });
      return;
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith('move:')
    ) {
      await onBulkMove(interaction);
      return;
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith('setrank:')
    ) {
      await onBulkSetRank(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('move:')) {
      await onBulkMove(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('setrank:')) {
      await onBulkSetRank(interaction);
      return;
    }

    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith('setrank:')
    ) {
      await onRankSubmit(interaction);
      return;
    }
  } catch (error) {
    const interactionName = interaction.isChatInputCommand()
      ? `/${interaction.commandName}`
      : 'customId' in interaction
        ? interaction.customId
        : interaction.type.toString();

    ErrorPresenter.log('interactionCreate', error, {
      commandName: interactionName,
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });

    if (!interaction.isRepliable()) {
      return;
    }

    const response = {
      embeds: [ErrorPresenter.present(error)],
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response);
      return;
    }

    await interaction.reply(response);
  }
}
