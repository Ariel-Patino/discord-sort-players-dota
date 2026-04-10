import type { Interaction } from 'discord.js';
import Logger from '@src/infrastructure/logging/Logger';
import ErrorPresenter from '@src/presentation/discord/ErrorPresenter';
import { onSetRankPageButton } from '../interactions/buttons/onSetRankPageButton';
import { onRankSubmit } from '../interactions/modals/onRankSubmit';
import { resolveSlashCommand } from '../interactions/slash-commands/CommandResolver';
import { onSetRankSelect } from '../interactions/select-menus/onSetRankSelect';

export async function handleInteractionCreate(
  interaction: Interaction
): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      const logContext = {
        commandName: `/${interaction.commandName}`,
        guildId: interaction.guildId,
        userId: interaction.user.id,
      };

      Logger.info('Executing slash command.', {
        ...logContext,
        metadata: {
          transport: 'slash',
        },
      });

      await resolveSlashCommand(interaction);

      Logger.info('Slash command completed.', {
        ...logContext,
        metadata: {
          transport: 'slash',
        },
      });
      return;
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith('setrank_select_page_')
    ) {
      await onSetRankSelect(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('setrank_')) {
      await onSetRankPageButton(interaction);
      return;
    }

    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith('setrank_modal:')
    ) {
      await onRankSubmit(interaction);
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
