import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

interface MenuOption {
  label: string;
  value: string;
  description?: string;
}

const MAX_MENU_OPTIONS = 25;

export const createMenu = (
  label: string,
  customId: string,
  options: MenuOption[]
): ActionRowBuilder<StringSelectMenuBuilder> =>
  new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(`Select ${label}`)
      .addOptions(options.slice(0, MAX_MENU_OPTIONS))
  );

export const disableRows = (
  rows: ActionRowBuilder<StringSelectMenuBuilder>[]
): ActionRowBuilder<StringSelectMenuBuilder>[] => {
  return rows.map((row) => {
    row.components.forEach((component) => component.setDisabled(true));
    return row;
  });
};
