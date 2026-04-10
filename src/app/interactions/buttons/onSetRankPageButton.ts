import { ButtonInteraction } from 'discord.js';
import { onBulkSetRank } from '../onBulkSetRank';

export async function onSetRankPageButton(
  interaction: ButtonInteraction
): Promise<void> {
  await onBulkSetRank(interaction);
}
