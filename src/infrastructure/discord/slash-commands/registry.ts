import { SlashCommandBuilder } from 'discord.js';
import { appConfig, formatRankBounds } from '@src/config/app-config';
import { t } from '@src/localization';

const slashCommandBuilders = [
  new SlashCommandBuilder()
    .setName('sort')
    .setDescription(t('commands.slash.sortDescription'))
    .addIntegerOption((option) =>
      option
        .setName('teams')
        .setDescription(t('commands.slash.sortTeamsOption'))
        .setRequired(false)
        .setMinValue(appConfig.sort.teams.minCount)
        .setMaxValue(appConfig.sort.teams.maxCount)
    ),

  new SlashCommandBuilder()
    .setName('go')
    .setDescription(t('commands.slash.goDescription')),

  new SlashCommandBuilder()
    .setName('lobby')
    .setDescription(t('commands.slash.lobbyDescription')),

  new SlashCommandBuilder()
    .setName('setrank')
    .setDescription(t('commands.slash.setrankDescription'))
    .addUserOption((option) =>
      option
        .setName('player')
        .setDescription(t('commands.slash.setrankPlayerOption'))
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName('rank')
        .setDescription(
          `${t('commands.slash.setrankRankOption')} (${formatRankBounds()})`
        )
        .setRequired(true)
        .setMinValue(appConfig.rank.min)
        .setMaxValue(appConfig.rank.max)
    ),
];

export const slashCommandRegistry = slashCommandBuilders.map((command) =>
  command.toJSON()
);

export type SlashCommandDefinition =
  (typeof slashCommandRegistry)[number];
