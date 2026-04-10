import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import { appConfig } from '@src/config/app-config';
import type { Player } from '@src/domain/models/Player';
import { t } from '@src/localization';

const PAGE_SIZE = appConfig.pagination.setRankPageSize;

export async function generateSetRankComponents(
  page: number,
  senderId: string,
  players: Player[]
) {
  const totalPages = Math.max(1, Math.ceil(players.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const currentEntries = players.slice(start, start + PAGE_SIZE);
  const select = new StringSelectMenuBuilder()
    .setCustomId(`setrank_select_page_${page}_user_${senderId}`)
    .setPlaceholder(t('interactions.rank.choosePlayer'))
    .addOptions(
      currentEntries.map((player) => ({
        label: player.displayName,
        description: `Username: ${player.id}`,
        value: player.id,
      }))
    );

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setrank_prev_${page}_user_${senderId}`)
      .setLabel('⏮ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),

    new ButtonBuilder()
      .setCustomId(`setrank_next_${page}_user_${senderId}`)
      .setLabel('Next ⏭')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );

  return {
    content: `📄 ${t('common.pageLabel', {
      current: page + 1,
      total: totalPages,
    })}`,
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      buttonRow,
    ],
  };
}
