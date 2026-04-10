import { EmbedBuilder } from 'discord.js';
import { t } from '@src/localization';
import {
  BOT_TITLE,
  PRIMARY_EMBED_COLOR,
} from '@src/shared/constants/branding';
import { getFallbackTeamLabel } from './team-labels';

export interface MatchEmbedTeamData {
  name?: string;
  score: string | number;
  players: string;
}

export interface MatchEmbedData {
  title?: string;
  description?: string;
  footerText?: string;
  teams?: MatchEmbedTeamData[];
  teamA?: MatchEmbedTeamData;
  teamB?: MatchEmbedTeamData;
}

export default class EmbedFactory {
  private static readonly COLORS = {
    info: 0x3498db,
    success: 0x2ecc71,
    warning: 0xf1c40f,
    error: 0xe74c3c,
    match: PRIMARY_EMBED_COLOR,
  } as const;

  static info(
    title = t('common.embed.infoTitle'),
    description = t('common.emptyValue')
  ): EmbedBuilder {
    return this.createBaseEmbed(title, description, this.COLORS.info);
  }

  static success(
    title = t('common.embed.successTitle'),
    description = t('common.emptyValue')
  ): EmbedBuilder {
    return this.createBaseEmbed(title, description, this.COLORS.success);
  }

  static warning(
    title = t('common.embed.warningTitle'),
    description = t('common.emptyValue')
  ): EmbedBuilder {
    return this.createBaseEmbed(title, description, this.COLORS.warning);
  }

  static error(
    title = t('common.embed.errorTitle'),
    description = t('common.emptyValue')
  ): EmbedBuilder {
    return this.createBaseEmbed(title, description, this.COLORS.error);
  }

  static match(data: MatchEmbedData): EmbedBuilder {
    const embed = this.createBaseEmbed(
      data.title ?? t('commands.sort.title'),
      data.description,
      this.COLORS.match
    );

    const teams = data.teams ?? [data.teamA, data.teamB].filter(
      (team): team is MatchEmbedTeamData => Boolean(team)
    );

    embed.addFields(
      teams.slice(0, 25).map((team, index) => ({
        name:
          team.name ??
          t('commands.sort.teamField', {
            teamName: getFallbackTeamLabel(index),
            score: team.score,
          }),
        value: team.players || t('common.emptyValue'),
        inline: false,
      }))
    );

    if (data.footerText) {
      embed.setFooter({ text: data.footerText });
    }

    return embed;
  }

  private static createBaseEmbed(
    title: string,
    description: string | undefined,
    color: number
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setFooter({ text: BOT_TITLE });

    if (description) {
      embed.setDescription(description);
    }

    return embed;
  }
}
