import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

export const createMenu = (label: string, customId: any, options: any) =>
  new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(`Select ${label}`)
      .addOptions(options.slice(0, 25))
  );

export const disableRows = (rows: any) => {
  return rows.map((row: any) => {
    row.components.forEach((c: any) => c.setDisabled(true));
    return row;
  });
};
