import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { formatAttributeLabel } from '@src/presentation/discord/AttributeFormatter';
import type PlayerInfo from '@src/types/playersInfo';
import type { SetAttributeSession } from '@src/state/setAttributeSessions';

const MAX_MENU_OPTIONS = 25;
const MAX_BUTTONS_PER_ROW = 5;
const MAX_ATTRIBUTE_BUTTONS = 20;
const FALLBACK_ATTRIBUTE_NAMES = ['support', 'carry', 'tank'] as const;

function orderAttributeNames(attributeNames: string[]): string[] {
  const normalizedNames = [...new Set(attributeNames.map((name) => name.trim().toLowerCase()))]
    .filter(Boolean);

  return [
    ...FALLBACK_ATTRIBUTE_NAMES.filter((name) => normalizedNames.includes(name)),
    ...normalizedNames
      .filter((name) => !FALLBACK_ATTRIBUTE_NAMES.includes(name as (typeof FALLBACK_ATTRIBUTE_NAMES)[number]))
      .sort((left, right) => left.localeCompare(right)),
  ];
}

function resolveRelevantAttributeNames(
  session: SetAttributeSession,
  playerMap: Record<string, PlayerInfo>
): string[] {
  const selectedPlayers = session.selectedPlayerIds
    .map((playerId) => playerMap[playerId])
    .filter((player): player is PlayerInfo => Boolean(player));

  if (selectedPlayers.length === 0) {
    return [...FALLBACK_ATTRIBUTE_NAMES];
  }

  if (selectedPlayers.length === 1) {
    return orderAttributeNames(Object.keys(selectedPlayers[0].attributes));
  }

  const attributeGroups = selectedPlayers.map(
    (player) => new Set(Object.keys(player.attributes))
  );
  const [firstGroup, ...remainingGroups] = attributeGroups;
  const commonNames = [...firstGroup].filter((name) =>
    remainingGroups.every((group) => group.has(name))
  );

  if (commonNames.length > 0) {
    return orderAttributeNames(commonNames);
  }

  return orderAttributeNames(
    selectedPlayers.flatMap((player) => Object.keys(player.attributes))
  );
}

function resolveAttributeButtonStyle(
  attributeName: string,
  session: SetAttributeSession,
  playerMap: Record<string, PlayerInfo>
): ButtonStyle {
  const selectedPlayers = session.selectedPlayerIds
    .map((playerId) => playerMap[playerId])
    .filter((player): player is PlayerInfo => Boolean(player));

  if (selectedPlayers.length === 0) {
    return ButtonStyle.Secondary;
  }

  const activeCount = selectedPlayers.filter((player) => {
    const attribute = player.attributes[attributeName];
    return Boolean(attribute?.isActive) && Number(attribute?.proficiency ?? 0) > 0;
  }).length;

  if (activeCount === selectedPlayers.length) {
    return ButtonStyle.Success;
  }

  if (activeCount > 0) {
    return ButtonStyle.Primary;
  }

  return ButtonStyle.Secondary;
}

export function buildSetAttributePrompt(
  session: SetAttributeSession,
  playerMap: Record<string, PlayerInfo>
): string {
  const selectedLabels = session.players
    .filter((player) => session.selectedPlayerIds.includes(player.value))
    .map((player) => player.label);
  const attributeNames = resolveRelevantAttributeNames(session, playerMap)
    .map(formatAttributeLabel);

  return [
    'Select one or more players from voice chat, then use the buttons below to toggle or add attributes.',
    '',
    `**Selected players:** ${selectedLabels.length > 0 ? selectedLabels.join(', ') : 'None yet'}`,
    `**Attributes shown:** ${attributeNames.length > 0 ? attributeNames.join(', ') : 'None yet'}`,
    ...(session.lastAction ? [`**Last action:** ${session.lastAction}`] : []),
  ].join('\n');
}

export function buildSetAttributeComponents(
  session: SetAttributeSession,
  playerMap: Record<string, PlayerInfo>,
  disableAll = false
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const playerSelect = new StringSelectMenuBuilder()
    .setCustomId(`setattribute:players:${session.id}`)
    .setPlaceholder('Choose one or more players')
    .setMinValues(1)
    .setMaxValues(Math.max(1, Math.min(session.players.length, MAX_MENU_OPTIONS)))
    .setDisabled(disableAll || session.players.length === 0)
    .addOptions(
      session.players.slice(0, MAX_MENU_OPTIONS).map((player) => ({
        label: player.label.slice(0, 100),
        value: player.value,
        description: player.description?.slice(0, 100),
        default: session.selectedPlayerIds.includes(player.value),
      }))
    );

  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      playerSelect
    ),
  ];

  const attributeButtons = resolveRelevantAttributeNames(session, playerMap)
    .slice(0, MAX_ATTRIBUTE_BUTTONS)
    .map((attributeName) =>
      new ButtonBuilder()
        .setCustomId(`setattribute:toggle:${session.id}:${attributeName}`)
        .setLabel(formatAttributeLabel(attributeName).slice(0, 80))
        .setStyle(resolveAttributeButtonStyle(attributeName, session, playerMap))
        .setDisabled(disableAll || session.selectedPlayerIds.length === 0)
    );

  for (let index = 0; index < attributeButtons.length; index += MAX_BUTTONS_PER_ROW) {
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        attributeButtons.slice(index, index + MAX_BUTTONS_PER_ROW)
      )
    );
  }

  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`setattribute:add:${session.id}`)
        .setLabel('Add Attribute')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disableAll || session.selectedPlayerIds.length === 0),
      new ButtonBuilder()
        .setCustomId(`setattribute:close:${session.id}`)
        .setLabel('EXIT')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disableAll)
    )
  );

  return rows;
}
