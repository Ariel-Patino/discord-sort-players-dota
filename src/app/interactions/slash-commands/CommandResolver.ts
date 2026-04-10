import type { ChatInputCommandInteraction } from 'discord.js';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';
import { onGoCommand } from './onGoCommand';
import { onLobbyCommand } from './onLobbyCommand';
import { onSetRankCommand } from './onSetRankCommand';
import { onSortCommand } from './onSortCommand';

export type SlashCommandHandler = (
  interaction: ChatInputCommandInteraction
) => Promise<void>;

const slashCommandHandlers: Record<string, SlashCommandHandler> = {
  sort: onSortCommand,
  go: onGoCommand,
  lobby: onLobbyCommand,
  setrank: onSetRankCommand,
};

export async function resolveSlashCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const handler = slashCommandHandlers[interaction.commandName];

  if (!handler) {
    await interaction.reply({
      embeds: [EmbedFactory.error(undefined, t('errors.invalidCommand'))],
      ephemeral: true,
    });
    return;
  }

  await handler(interaction);
}
