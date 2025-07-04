import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import { getAllPlayers } from '@src/services/players.service';

const PAGE_SIZE = 25;

export async function generateSetRankComponents(
  page: number,
  senderId: string
) {
  const players = await getAllPlayers();
  const entries = Object.entries(players);
  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const currentEntries = entries.slice(start, start + PAGE_SIZE);
  const select = new StringSelectMenuBuilder()
    .setCustomId(`setrank_select_page_${page}_user_${senderId}`)
    .setPlaceholder('Choose a player')
    .addOptions(
      currentEntries.map(([id, info]) => ({
        label: info.dotaName,
        description: `Username: ${id}`,
        value: id,
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
    content: `📄 Page ${page + 1} of ${totalPages}`,
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      buttonRow,
    ],
  };
}
