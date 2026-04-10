import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { t } from '@src/localization';
import type { BulkMoveSession } from '@src/state/bulkMoveSessions';

const MAX_MENU_OPTIONS = 25;
const MAX_BUTTONS_PER_ROW = 5;
const MAX_CHANNEL_BUTTONS = 15;

export function buildBulkMovePrompt(session: BulkMoveSession): string {
  const selectedChannelName = session.channels.find(
    (channel) => channel.value === session.selectedChannelId
  )?.label;

  return [
    t('interactions.move.prompt'),
    '',
    `**Selected players:** ${session.selectedMemberIds.length}`,
    `**Destination:** ${selectedChannelName ?? t('interactions.move.noChannelSelected')}`,
  ].join('\n');
}

export function buildBulkMoveComponents(
  session: BulkMoveSession,
  disableAll = false
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const memberSelect = new StringSelectMenuBuilder()
    .setCustomId(`move:members:${session.id}`)
    .setPlaceholder(t('interactions.move.selectPlayersPlaceholder'))
    .setMinValues(1)
    .setMaxValues(Math.max(1, Math.min(session.members.length, MAX_MENU_OPTIONS)))
    .setDisabled(disableAll)
    .addOptions(
      session.members.slice(0, MAX_MENU_OPTIONS).map((member) => ({
        label: member.label,
        value: member.value,
        description: member.description,
        default: session.selectedMemberIds.includes(member.value),
      }))
    );

  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(memberSelect),
  ];

  const channelButtons = session.channels
    .slice(0, MAX_CHANNEL_BUTTONS)
    .map((channel) =>
      new ButtonBuilder()
        .setCustomId(`move:channel:${session.id}:${channel.value}`)
        .setLabel(channel.label.slice(0, 80))
        .setStyle(
          session.selectedChannelId === channel.value
            ? ButtonStyle.Primary
            : ButtonStyle.Secondary
        )
        .setDisabled(disableAll)
    );

  for (let index = 0; index < channelButtons.length; index += MAX_BUTTONS_PER_ROW) {
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        channelButtons.slice(index, index + MAX_BUTTONS_PER_ROW)
      )
    );
  }

  const moveButton = new ButtonBuilder()
    .setCustomId(`move:execute:${session.id}`)
    .setLabel(t('interactions.move.executeLabel'))
    .setStyle(ButtonStyle.Success)
    .setDisabled(
      disableAll ||
        session.selectedMemberIds.length === 0 ||
        !session.selectedChannelId
    );

  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      moveButton
    )
  );

  return rows;
}

export function disableMoveRows(
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
