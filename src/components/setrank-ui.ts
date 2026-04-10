import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { appConfig } from '@src/config/app-config';
import { t } from '@src/localization';
import type { SetRankSession } from '@src/state/setRankSessions';

const PAGE_SIZE = appConfig.pagination.setRankPageSize;

export function buildSetRankPrompt(session: SetRankSession): string {
  const selectedPlayer = session.players.find((player) =>
    session.selectedPlayerIds.includes(player.value)
  );

  return [
    t('interactions.rank.prompt', {
      bounds: `${appConfig.rank.min.toFixed(2)} - ${appConfig.rank.max.toFixed(2)}`,
    }),
    '',
    `**Last selected player:** ${selectedPlayer?.label ?? t('interactions.rank.noPlayerSelected')}`,
  ].join('\n');
}

export function buildSetRankComponents(
  session: SetRankSession,
  disableAll = false
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const totalPlayerPages = Math.max(1, Math.ceil(session.players.length / PAGE_SIZE));
  const playerPage = Math.min(session.playerPage, totalPlayerPages - 1);
  const playerStart = playerPage * PAGE_SIZE;
  const currentPlayers = session.players.slice(playerStart, playerStart + PAGE_SIZE);

  const playerSelect = new StringSelectMenuBuilder()
    .setCustomId(`setrank:players:${session.id}:${playerPage}`)
    .setPlaceholder(t('interactions.rank.choosePlayer'))
    .setMinValues(1)
    .setMaxValues(1)
    .setDisabled(disableAll)
    .addOptions(
      currentPlayers.map((player) => ({
        label: player.label,
        value: player.value,
        description: player.description,
        default: session.selectedPlayerIds.includes(player.value),
      }))
    );

  const playerButtons = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setrank:players-page:${session.id}:prev`)
      .setLabel('⏮ Prev players')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableAll || playerPage === 0),
    new ButtonBuilder()
      .setCustomId(`setrank:players-page:${session.id}:next`)
      .setLabel('Next players ⏭')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableAll || playerPage >= totalPlayerPages - 1)
  );

  return [
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(playerSelect),
    playerButtons,
  ];
}

export function disableSetRankRows(
  rows: ActionRowBuilder<MessageActionRowComponentBuilder>[]
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  return rows.map((row) => {
    row.components.forEach((component) => {
      if (component instanceof ButtonBuilder || component instanceof StringSelectMenuBuilder) {
        component.setDisabled(true);
      }
    });
    return row;
  });
}
