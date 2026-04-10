import {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { formatRankBounds } from '@src/config/app-config';
import { t } from '@src/localization';
import EmbedFactory from '@src/presentation/discord/embeds';

export async function onSetRankSelect(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  const [, , , , , userId] = interaction.customId.split('_');

  if (interaction.user.id !== userId) {
    await interaction.reply({
      embeds: [EmbedFactory.error(undefined, t('errors.unauthorizedInteraction'))],
      ephemeral: true,
    });
    return;
  }

  const selectedId = interaction.values[0];
  const modal = new ModalBuilder()
    .setCustomId(`setrank_modal:${selectedId}`)
    .setTitle(t('interactions.rank.modalTitle'))
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('rank_value')
          .setLabel(
            t('interactions.rank.inputLabel', {
              bounds: formatRankBounds(),
            })
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

  await interaction.showModal(modal);
}
